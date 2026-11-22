import { erro, json, preflight } from "../_shared/http.mjs";
import { getAdminClient } from "../_shared/supabase-admin.mjs";
import {
  checkPayment,
  getInfinitepayConfig,
  missingInfinitepaySecrets,
} from "../_shared/infinitepay-api.mjs";
import {
  amountsMatchCents,
  normalizePaymentCheck,
  parseWebhookEvent,
  safeErrorMessage,
} from "../_shared/infinitepay-core.mjs";
import {
  PaymentError,
  aplicarRecursoInfinitepay,
  carregarRecursoParaWebhook,
  marcarErroPagamento,
} from "../_shared/payment-service.mjs";

type WebhookEvent = ReturnType<typeof parseWebhookEvent>;

function resumo(body: Record<string, unknown>, event: WebhookEvent) {
  return {
    evento: event.event || null,
    order_nsu: event.orderNsu || null,
    transaction_nsu: event.transactionNsu || null,
    invoice_slug: event.slug || null,
    amount: event.amount,
    paid_amount: event.paidAmount,
    capture_method: event.captureMethod || null,
    live_mode: typeof body?.live_mode === "boolean" ? body.live_mode : null,
  };
}

async function marcarWebhook(id: string, patch: Record<string, unknown>) {
  const admin = getAdminClient();
  const { error } = await admin
    .from("cardapio_exemplo_webhooks_processados")
    .update(patch)
    .eq("id", id);
  if (error) console.error("Falha ao atualizar webhook", { id, code: error.code });
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return erro("Método não permitido.", 405);

  let webhookId = null;
  let body: Record<string, unknown> = {};
  let event: WebhookEvent | null = null;

  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const texto = await req.text();
    try {
      const parsed = texto ? JSON.parse(texto) : {};
      body = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return erro("Corpo do webhook inválido.", 400);
    }

    event = parseWebhookEvent({
      query,
      body,
      header: {
        event:
          req.headers.get("x-infinitepay-event") ??
          req.headers.get("x-event-type") ??
          req.headers.get("x-webhook-event") ??
          req.headers.get("x-event") ??
          "",
      },
    });
    if (!event.orderNsu) {
      return json({ ok: true, ignored: true, motivo: "evento sem order_nsu" });
    }

    const config = getInfinitepayConfig();
    const faltando = missingInfinitepaySecrets(config);
    if (faltando.length) {
      console.error("Webhook InfinitePay recebido sem credenciais configuradas.", { faltando });
      return erro("Webhook não configurado no servidor.", 503);
    }

    const admin = getAdminClient();
    const { data: existente, error: existenteError } = await admin
      .from("cardapio_exemplo_webhooks_processados")
      .select("*")
      .eq("evento_key", event.eventKey)
      .maybeSingle();
    if (existenteError) throw new Error("Falha ao consultar idempotência do webhook.");

    if (existente?.status === "processado" || existente?.status === "ignorado") {
      return json({ ok: true, duplicado: true });
    }
    if (existente?.status === "processando") {
      const recebido = existente.recebido_em ? new Date(existente.recebido_em).getTime() : 0;
      if (Date.now() - recebido < 2 * 60 * 1000) {
        return json({ ok: true, processando: true });
      }
    }

    const requestId = req.headers.get("x-request-id");
    if (existente) {
      webhookId = existente.id;
      await marcarWebhook(webhookId, {
        status: "processando",
        tentativas: Number(existente.tentativas ?? 1) + 1,
        verificado: false,
        erro: null,
        processado_em: null,
      });
    } else {
      const { data: criado, error: criadoError } = await admin
        .from("cardapio_exemplo_webhooks_processados")
        .insert({
          provedor: "infinitepay",
          topico: event.event || "checkout",
          recurso_id: event.transactionNsu || event.slug || event.orderNsu,
          acao: event.event || null,
          evento_key: event.eventKey,
          request_id: requestId,
          verificado: false,
          status: "processando",
          tentativas: 1,
          payload_resumo: resumo(body, event),
        })
        .select("id")
        .single();
      if (criadoError) throw new Error("Falha ao registrar webhook.");
      webhookId = criado.id;
    }

    const { pedido, pagamento } = await carregarRecursoParaWebhook({
      orderNsu: event.orderNsu,
      transactionNsu: event.transactionNsu,
      slug: event.slug,
    });
    if (!pedido || !pagamento) {
      await marcarWebhook(webhookId, {
        status: "ignorado",
        erro: "Recurso não pertence a um pedido deste cardápio.",
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ignorado: true });
    }

    const transactionNsu = event.transactionNsu || pagamento.gateway_payment_id;
    const slug = event.slug || pagamento.gateway_checkout_id;
    if (!transactionNsu || !slug) {
      await marcarWebhook(webhookId, {
        status: "ignorado",
        erro: "Notificação sem transaction_nsu ou slug para confirmação.",
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ignorado: true });
    }

    if (pagamento.status === "aprovado" && ["paid", "settled"].includes(event.event)) {
      await marcarWebhook(webhookId, {
        status: "processado",
        verificado: true,
        erro: null,
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ja_confirmado: true });
    }

    const check = await checkPayment(config, {
      orderNsu: event.orderNsu,
      transactionNsu,
      slug,
    });

    if (check?.success === false) {
      await marcarWebhook(webhookId, {
        status: "ignorado",
        verificado: true,
        erro: "A InfinitePay não confirmou os dados do pagamento.",
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ignorado: true, motivo: "payment_check success=false" });
    }

    if (check?.amount !== null && check?.amount !== undefined && !amountsMatchCents(pedido.total, check.amount)) {
      await marcarErroPagamento({
        pedido,
        pagamento,
        erro: `Valor divergente: pedido R$ ${Number(pedido.total).toFixed(2)} x InfinitePay R$ ${(Number(check.amount) / 100).toFixed(2)}.`,
        origem: "webhook",
        evento: "valor_divergente",
      });
      await marcarWebhook(webhookId, {
        status: "ignorado",
        verificado: true,
        erro: "Valor divergente do pedido.",
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ignorado: true, motivo: "valor divergente" });
    }

    const normalized = {
      ...normalizePaymentCheck(check, {
        expectedTotal: pedido.total,
        event: event.event,
      }),
      orderNsu: event.orderNsu,
      transactionNsu,
      slug,
      checkoutUrl: pagamento.checkout_url,
      receiptUrl: event.receiptUrl || null,
    };

    await aplicarRecursoInfinitepay({
      pedido,
      pagamento,
      normalized,
      origem: "webhook",
      evento: `webhook_${event.event || "checkout"}`,
    });

    await marcarWebhook(webhookId, {
      status: "processado",
      verificado: true,
      erro: null,
      processado_em: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (error) {
    const mensagem = safeErrorMessage(error, "Falha ao processar webhook.");
    if (webhookId) {
      await marcarWebhook(webhookId, {
        status: "erro",
        erro: mensagem,
      });
    }
    console.error("Falha no webhook InfinitePay", {
      evento: event?.event ?? null,
      pedido: event?.orderNsu ?? null,
      message: mensagem,
    });
    if (error instanceof PaymentError && [404, 409].includes(error.status)) {
      return json({ ok: true, erro_registrado: true });
    }
    return erro("Falha ao processar webhook.", 500);
  }
});

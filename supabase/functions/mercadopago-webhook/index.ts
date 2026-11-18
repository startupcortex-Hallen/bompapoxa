import { erro, json, preflight } from "../_shared/http.mjs";
import { getAdminClient } from "../_shared/supabase-admin.mjs";
import { getMpConfig, getOrder, getPayment } from "../_shared/mp-api.mjs";
import {
  extractWebhookEvent,
  normalizeOrderResource,
  normalizePaymentResource,
  safeErrorMessage,
  validateWebhookSignature,
} from "../_shared/mp-core.mjs";
import {
  PaymentError,
  aplicarRecursoMercadoPago,
  carregarRecursoParaWebhook,
} from "../_shared/payment-service.mjs";

type WebhookEvent = {
  action?: string | null;
  dataId?: string | null;
  topic?: string | null;
  notificationId?: string | null;
};

function resumo(body: Record<string, unknown>, event: WebhookEvent) {
  return {
    action: event.action || null,
    data_id: event.dataId || null,
    tipo: event.topic || null,
    live_mode: typeof body?.live_mode === "boolean" ? body.live_mode : null,
    notification_id: event.notificationId,
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
  let body = null;
  let event = null;

  try {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const texto = await req.text();
    try {
      body = texto ? JSON.parse(texto) : {};
    } catch {
      return erro("Corpo do webhook inválido.", 400);
    }

    event = extractWebhookEvent({ query, body });
    if (!event.dataId || (event.topic !== "order" && event.topic !== "payment")) {
      return json({ ok: true, ignored: true, motivo: "evento sem recurso reconhecido" });
    }

    const config = getMpConfig();
    if (!config.webhookSecret) {
      console.error("Webhook recebido sem MERCADOPAGO_WEBHOOK_SECRET configurado.");
      return erro("Webhook não configurado no servidor.", 503);
    }

    const assinaturaValida = await validateWebhookSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: event.dataId,
      secret: config.webhookSecret,
    });
    if (!assinaturaValida) {
      console.warn("Webhook com assinatura inválida rejeitado.", { topico: event.topic });
      return erro("Assinatura do webhook inválida.", 401);
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

    if (existente) {
      webhookId = existente.id;
      await marcarWebhook(webhookId, {
        status: "processando",
        tentativas: Number(existente.tentativas ?? 1) + 1,
        assinatura_valida: true,
        erro: null,
        processado_em: null,
      });
    } else {
      const { data: criado, error: criadoError } = await admin
        .from("cardapio_exemplo_webhooks_processados")
        .insert({
          topico: event.topic,
          recurso_id: event.dataId,
          acao: event.action || null,
          evento_key: event.eventKey,
          request_id: req.headers.get("x-request-id"),
          assinatura_valida: true,
          status: "processando",
          tentativas: 1,
          payload_resumo: resumo(body, event),
        })
        .select("id")
        .single();
      if (criadoError) throw new Error("Falha ao registrar webhook.");
      webhookId = criado.id;
    }

    let normalized;
    if (event.topic === "order") {
      const order = await getOrder(config, event.dataId);
      normalized = normalizeOrderResource(order);
    } else {
      const payment = await getPayment(config, event.dataId);
      normalized = normalizePaymentResource(payment);
    }

    const { pedido, pagamento } = await carregarRecursoParaWebhook(normalized);
    if (!pedido || !pagamento) {
      await marcarWebhook(webhookId, {
        status: "ignorado",
        erro: "Recurso não pertence a um pedido deste cardápio.",
        processado_em: new Date().toISOString(),
      });
      return json({ ok: true, ignorado: true });
    }

    await aplicarRecursoMercadoPago({
      pedido,
      pagamento,
      normalized,
      origem: "webhook",
      evento: `webhook_${event.topic}`,
    });

    await marcarWebhook(webhookId, {
      status: "processado",
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
    console.error("Falha no webhook Mercado Pago", {
      topico: event?.topic ?? null,
      recurso: event?.dataId ?? null,
      message: mensagem,
    });
    if (error instanceof PaymentError && [404, 409].includes(error.status)) {
      return json({ ok: true, erro_registrado: true });
    }
    return erro("Falha ao processar webhook.", 500);
  }
});

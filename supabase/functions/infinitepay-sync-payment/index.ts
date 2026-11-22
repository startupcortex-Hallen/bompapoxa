import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import {
  PaymentError,
  aplicarRecursoInfinitepay,
  atualizarPagamento,
  carregarPagamentoDoPedido,
  carregarPedidoPorToken,
  marcarErroPagamento,
  registrarEvento,
  serializarPagamentoPublico,
} from "../_shared/payment-service.mjs";
import {
  InfinitepayError,
  checkPayment,
  getInfinitepayConfig,
  missingInfinitepaySecrets,
} from "../_shared/infinitepay-api.mjs";
import {
  amountsMatchCents,
  captureMethodToTipo,
  normalizePaymentCheck,
  safeErrorMessage,
} from "../_shared/infinitepay-core.mjs";

function statusHttp(error: unknown) {
  const status = Number((error as { status?: number } | null)?.status ?? 0);
  return status >= 400 && status <= 599 ? status : 502;
}

function resposta(pagamento: Record<string, unknown>) {
  return {
    ok: true,
    tipo: String(pagamento.tipo ?? "online"),
    status: String(pagamento.status ?? "pendente"),
    pagamento: serializarPagamentoPublico(pagamento),
    checkoutUrl: typeof pagamento.checkout_url === "string" ? pagamento.checkout_url : null,
  };
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return erro("Método não permitido.", 405);

  let pedido = null;
  let pagamento = null;
  try {
    const body = await lerJson(req);
    pedido = await carregarPedidoPorToken(
      String(body?.pedidoId ?? "").trim(),
      String(body?.trackingToken ?? "").trim(),
    );
    pagamento = await carregarPagamentoDoPedido(pedido.id);
    if (!pagamento) {
      throw new PaymentError("Este pedido não possui pagamento online.", 404);
    }
    if (pagamento.status === "aprovado") return json(resposta(pagamento));

    const forcar = Boolean(body?.forcar);
    const sincronizado = pagamento.sincronizado_em ? new Date(pagamento.sincronizado_em).getTime() : 0;
    if (!forcar && sincronizado && Date.now() - sincronizado < 5000) {
      return json({ ...resposta(pagamento), cache: true });
    }

    const config = getInfinitepayConfig();
    const faltando = missingInfinitepaySecrets(config);
    if (faltando.length) {
      throw new PaymentError(`Credenciais InfinitePay ausentes: ${faltando.join(", ")}.`, 503);
    }

    const transactionNsu = String(body?.transactionNsu ?? pagamento.gateway_payment_id ?? "").trim();
    const slug = String(body?.slug ?? pagamento.gateway_checkout_id ?? "").trim();
    const captureMethod = String(body?.captureMethod ?? "").trim();
    const receiptUrl = String(body?.receiptUrl ?? "").trim();
    const evento = String(body?.event ?? "").trim();

    const patchReferencias: Record<string, unknown> = {};
    if (transactionNsu && transactionNsu !== pagamento.gateway_payment_id) {
      patchReferencias.gateway_payment_id = transactionNsu;
    }
    if (slug && slug !== pagamento.gateway_checkout_id) {
      patchReferencias.gateway_checkout_id = slug;
    }
    if (captureMethod) {
      const tipo = captureMethodToTipo(captureMethod);
      if (tipo !== "online" && tipo !== pagamento.tipo) patchReferencias.tipo = tipo;
    }
    if (receiptUrl && receiptUrl !== pagamento.receipt_url) {
      patchReferencias.receipt_url = receiptUrl;
    }
    if (Object.keys(patchReferencias).length) {
      pagamento = await atualizarPagamento(pagamento.id, {
        ...patchReferencias,
        sincronizado_em: new Date().toISOString(),
      });
    }

    if (!transactionNsu || !slug) {
      const atualizado = await atualizarPagamento(pagamento.id, {
        ultimo_erro: null,
        sincronizado_em: new Date().toISOString(),
      });
      return json({
        ...resposta(atualizado),
        aguardando: true,
        mensagem: "Finalize a compra no checkout da InfinitePay. A confirmação chega automaticamente.",
      });
    }

    const check = await checkPayment(config, {
      orderNsu: String(pedido.id),
      transactionNsu,
      slug,
    });

    if (check?.success === false) {
      const atualizado = await atualizarPagamento(pagamento.id, {
        ultimo_erro: "A InfinitePay ainda não confirmou os dados deste pagamento.",
        sincronizado_em: new Date().toISOString(),
      });
      await registrarEvento({
        pagamentoId: pagamento.id,
        pedidoId: pedido.id,
        origem: "sincronizacao",
        evento: "consulta_nao_confirmada",
        statusAnterior: pagamento.status,
        statusNovo: pagamento.status,
        detalhe: { transaction_nsu: transactionNsu, slug },
      });
      return json({
        ...resposta(atualizado),
        aguardando: true,
        mensagem: "A InfinitePay ainda não confirmou este pagamento. Aguarde alguns instantes.",
      });
    }

    if (check?.amount !== null && check?.amount !== undefined && !amountsMatchCents(pedido.total, check.amount)) {
      await marcarErroPagamento({
        pedido,
        pagamento,
        erro: `Valor divergente: pedido R$ ${Number(pedido.total).toFixed(2)} x InfinitePay R$ ${(Number(check.amount) / 100).toFixed(2)}.`,
        origem: "sincronizacao",
        evento: "valor_divergente",
      });
      throw new PaymentError("Valor do pagamento divergente do pedido. Pagamento não aprovado.", 409);
    }

    const normalized = {
      ...normalizePaymentCheck(check, {
        expectedTotal: pedido.total,
        event: evento,
      }),
      orderNsu: String(pedido.id),
      transactionNsu,
      slug,
      checkoutUrl: pagamento.checkout_url,
      receiptUrl: receiptUrl || null,
    };

    const aplicado = await aplicarRecursoInfinitepay({
      pedido,
      pagamento,
      normalized,
      origem: "sincronizacao",
      evento: "consulta_manual_infinitepay",
    });

    return json({
      ...resposta(aplicado.pagamento),
      mensagem:
        aplicado.statusNovo === "aprovado"
          ? "Pagamento confirmado pela InfinitePay."
          : "O checkout ainda não registrou o pagamento.",
    });
  } catch (error) {
    if (pagamento) {
      try {
        await atualizarPagamento(pagamento.id, {
          ultimo_erro: safeErrorMessage(error, "Erro na comunicação com a InfinitePay."),
          sincronizado_em: new Date().toISOString(),
        });
        await registrarEvento({
          pagamentoId: pagamento.id,
          pedidoId: pedido?.id ?? null,
          origem: "sincronizacao",
          evento: "erro_consulta_pagamento",
          statusAnterior: pagamento.status,
          statusNovo: pagamento.status,
          detalhe: { erro: safeErrorMessage(error) },
        });
      } catch {
        // Mantém a resposta original.
      }
    }
    const status = error instanceof InfinitepayError || error instanceof PaymentError ? statusHttp(error) : 500;
    console.error("Falha ao sincronizar pagamento InfinitePay", {
      status: (error as { status?: number } | null)?.status ?? 0,
      message: safeErrorMessage(error),
    });
    return erro(safeErrorMessage(error, "Não foi possível consultar o pagamento."), status);
  }
});

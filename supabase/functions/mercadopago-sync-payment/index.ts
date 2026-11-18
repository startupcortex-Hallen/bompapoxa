import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import {
  PaymentError,
  aplicarRecursoMercadoPago,
  atualizarPagamento,
  carregarPagamentoDoPedido,
  carregarPedidoPorToken,
  registrarEvento,
  serializarPagamentoPublico,
} from "../_shared/payment-service.mjs";
import { getMpConfig, getOrder, getPayment, MercadoPagoError } from "../_shared/mp-api.mjs";
import {
  normalizeOrderResource,
  normalizePaymentResource,
  safeErrorMessage,
} from "../_shared/mp-core.mjs";

function statusHttp(error: unknown) {
  const status = Number((error as { status?: number } | null)?.status ?? 0);
  return status >= 400 && status <= 599 ? status : 502;
}

function resposta(pagamento: Record<string, unknown>) {
  const tipo = String(pagamento.tipo ?? "pix");
  const status = String(pagamento.status ?? "pendente");
  const initPoint = typeof pagamento.init_point === "string" ? pagamento.init_point : null;
  return {
    ok: true,
    tipo,
    status,
    pagamento: serializarPagamentoPublico(pagamento),
    checkoutUrl: tipo === "cartao" ? initPoint : null,
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

    const config = getMpConfig();
    if (!config.accessToken) {
      throw new PaymentError("Access Token do Mercado Pago não configurado.", 503);
    }

    let aplicado = null;
    if (pagamento.tipo === "pix" && pagamento.mp_order_id) {
      const order = await getOrder(config, pagamento.mp_order_id);
      aplicado = await aplicarRecursoMercadoPago({
        pedido,
        pagamento,
        normalized: normalizeOrderResource(order),
        origem: "sincronizacao",
        evento: "consulta_manual_pix",
      });
    } else if (pagamento.mp_payment_id) {
      const payment = await getPayment(config, pagamento.mp_payment_id);
      aplicado = await aplicarRecursoMercadoPago({
        pedido,
        pagamento,
        normalized: normalizePaymentResource(payment),
        origem: "sincronizacao",
        evento: "consulta_manual_pagamento",
      });
    } else if (pagamento.mp_preference_id) {
      const atualizado = await atualizarPagamento(pagamento.id, {
        ultimo_erro: null,
        sincronizado_em: new Date().toISOString(),
      });
      return json({
        ...resposta(atualizado),
        aguardando: true,
        mensagem: "O Checkout Pro ainda não enviou um pagamento. Finalize a compra no Mercado Pago.",
      });
    } else {
      throw new PaymentError("Pagamento online ainda não possui identificador no Mercado Pago.", 409);
    }

    return json(resposta(aplicado.pagamento));
  } catch (error) {
    if (pagamento) {
      try {
        await atualizarPagamento(pagamento.id, {
          ultimo_erro: safeErrorMessage(error, "Erro na comunicação com o Mercado Pago."),
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
    const status = error instanceof MercadoPagoError || error instanceof PaymentError ? statusHttp(error) : 500;
    console.error("Falha ao sincronizar pagamento", {
      status: (error as { status?: number } | null)?.status ?? 0,
      message: safeErrorMessage(error),
    });
    return erro(safeErrorMessage(error, "Não foi possível consultar o pagamento."), status);
  }
});

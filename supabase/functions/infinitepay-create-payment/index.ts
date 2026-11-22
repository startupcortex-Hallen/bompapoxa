import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import {
  buildCheckoutPayload,
  extractCheckoutUrl,
  safeErrorMessage,
} from "../_shared/infinitepay-core.mjs";
import {
  InfinitepayError,
  buildReturnUrl,
  createPaymentLink,
  getInfinitepayConfig,
  missingInfinitepaySecrets,
} from "../_shared/infinitepay-api.mjs";
import {
  PaymentError,
  atualizarPagamento,
  atualizarSnapshotImpressao,
  carregarPagamentoDoPedido,
  carregarPedidoPorToken,
  criarOuReutilizarTentativa,
  marcarErroPagamento,
  marcarPedidoComProvedor,
  registrarEvento,
  serializarPagamentoPublico,
  validarOnlineHabilitado,
} from "../_shared/payment-service.mjs";

function statusHttp(error: unknown) {
  const status = Number((error as { status?: number } | null)?.status ?? 0);
  return status >= 400 && status <= 599 ? status : 502;
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST") return erro("Método não permitido.", 405);

  let pedido = null;
  let pagamento = null;

  try {
    const body = await lerJson(req);
    const pedidoId = String(body?.pedidoId ?? "").trim();
    const trackingToken = String(body?.trackingToken ?? "").trim();

    pedido = await carregarPedidoPorToken(pedidoId, trackingToken);
    if (pedido.status === "cancelado") {
      throw new PaymentError("Pedido cancelado. Não é possível iniciar pagamento online.", 409);
    }
    if (pedido.status_pagamento === "pago") {
      throw new PaymentError("Este pedido já está pago.", 409);
    }

    await validarOnlineHabilitado();
    const config = getInfinitepayConfig();
    const faltando = missingInfinitepaySecrets(config);
    if (faltando.length) {
      throw new PaymentError(
        `Integração InfinitePay ainda não configurada no servidor. Credenciais ausentes: ${faltando.join(", ")}.`,
        503,
      );
    }
    if (!config.webhookUrl) {
      throw new PaymentError("URL pública do webhook InfinitePay não configurada.", 503);
    }

    const tentativa = await criarOuReutilizarTentativa({
      pedido,
      ambiente: "producao",
      tipo: "online",
    });
    pagamento = tentativa.pagamento;
    await marcarPedidoComProvedor(pedido.id, "online");

    if (tentativa.jaPago) {
      return json({
        ok: true,
        jaPago: true,
        reutilizado: true,
        tipo: pagamento.tipo,
        status: pagamento.status,
        pagamento: serializarPagamentoPublico(pagamento),
      });
    }

    if (tentativa.reutilizado && pagamento.checkout_url) {
      return json({
        ok: true,
        jaPago: false,
        reutilizado: true,
        tipo: pagamento.tipo,
        status: pagamento.status,
        pagamento: serializarPagamentoPublico(pagamento),
        checkoutUrl: pagamento.checkout_url,
        mensagem: "Finalize o pagamento no checkout da InfinitePay.",
      });
    }

    if (Number(pedido.total) < 1) {
      throw new PaymentError("A InfinitePay exige valor mínimo de R$ 1,00 para pagamento online.", 400);
    }

    const redirectUrl = buildReturnUrl({
      appUrl: config.appUrl,
      pedidoId: pedido.id,
      token: pedido.tracking_token,
    });
    const payload = buildCheckoutPayload({
      order: pedido,
      config,
      redirectUrl,
      webhookUrl: config.webhookUrl,
    });
    const resposta = await createPaymentLink(config, payload);
    const checkoutUrl = extractCheckoutUrl(resposta);
    if (!checkoutUrl) {
      throw new InfinitepayError("A InfinitePay não retornou uma URL de checkout válida.", 502);
    }

    const atualizado = await atualizarPagamento(pagamento.id, {
      status: "pendente",
      status_gateway: "link_criado",
      tipo: "online",
      metodo: "checkout",
      gateway_order_id: String(pedido.id),
      checkout_url: checkoutUrl,
      ultimo_erro: null,
      sincronizado_em: new Date().toISOString(),
    });

    await registrarEvento({
      pagamentoId: atualizado.id,
      pedidoId: pedido.id,
      origem: "criacao",
      evento: "checkout_infinitepay_criado",
      statusAnterior: "pendente",
      statusNovo: "pendente",
      detalhe: {
        gateway_order_id: String(pedido.id),
        checkout_url: checkoutUrl,
        valor_centavos: Math.round(Number(pedido.total) * 100),
      },
    });
    await atualizarSnapshotImpressao(pedido.id);

    return json({
      ok: true,
      jaPago: false,
      reutilizado: false,
      tipo: "online",
      status: "pendente",
      checkoutUrl,
      pagamento: serializarPagamentoPublico(atualizado),
      mensagem: "Checkout da InfinitePay criado.",
    });
  } catch (error) {
    if (pagamento && pedido) {
      try {
        const atual = await carregarPagamentoDoPedido(pedido.id);
        if (atual && atual.status !== "aprovado") {
          await marcarErroPagamento({
            pedido,
            pagamento: atual,
            erro: safeErrorMessage(error),
            origem: "criacao",
            evento: "falha_criacao_pagamento",
          });
        }
      } catch {
        // A resposta de erro original deve ser preservada.
      }
    }
    console.error("Falha ao criar checkout InfinitePay", {
      status: (error as { status?: number } | null)?.status ?? 0,
      message: safeErrorMessage(error),
    });
    return erro(safeErrorMessage(error, "Não foi possível iniciar o pagamento online."), statusHttp(error));
  }
});

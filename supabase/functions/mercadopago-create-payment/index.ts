import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import {
  buildPixOrderBody,
  buildPreferenceBody,
  normalizeOrderResource,
} from "../_shared/mp-core.mjs";
import {
  MercadoPagoError,
  buildReturnUrls,
  createPixOrder,
  createPreference,
  getMpConfig,
  missingMpSecrets,
} from "../_shared/mp-api.mjs";
import {
  PaymentError,
  aplicarRecursoMercadoPago,
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
import { safeErrorMessage } from "../_shared/mp-core.mjs";

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
  let tipo = "pix";

  try {
    const body = await lerJson(req);
    const pedidoId = String(body?.pedidoId ?? "").trim();
    const trackingToken = String(body?.trackingToken ?? "").trim();
    tipo = String(body?.tipo ?? "").trim();

    if (tipo !== "pix" && tipo !== "cartao") {
      throw new PaymentError("Tipo de pagamento online inválido.", 400);
    }

    pedido = await carregarPedidoPorToken(pedidoId, trackingToken);
    if (pedido.status === "cancelado") {
      throw new PaymentError("Pedido cancelado. Não é possível iniciar pagamento online.", 409);
    }
    if (pedido.status_pagamento === "pago") {
      throw new PaymentError("Este pedido já está pago.", 409);
    }

    await validarOnlineHabilitado(tipo);
    const config = getMpConfig();
    if (!config.accessToken || !config.webhookSecret) {
      throw new PaymentError(
        "Integração Mercado Pago ainda não configurada no servidor. Consulte a documentação de ativação.",
        503,
      );
    }
    const faltando = missingMpSecrets(config);
    if (!config.accessToken) {
      throw new PaymentError(`Credenciais ausentes: ${faltando.join(", ")}.`, 503);
    }
    if (tipo === "pix" && !pedido.cliente_email) {
      throw new PaymentError("Informe um e-mail válido para pagar com PIX online.", 400);
    }

    const tentativa = await criarOuReutilizarTentativa({
      pedido,
      tipo,
      ambiente: config.ambiente,
    });
    pagamento = tentativa.pagamento;

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

    if (tentativa.reutilizado) {
      return json({
        ok: true,
        jaPago: false,
        reutilizado: true,
        tipo: pagamento.tipo,
        status: pagamento.status,
        pagamento: serializarPagamentoPublico(pagamento),
        checkoutUrl: pagamento.tipo === "cartao" ? pagamento.init_point : null,
      });
    }

    await marcarPedidoComProvedor(pedido.id, tipo);

    if (tipo === "pix") {
      const corpo = buildPixOrderBody({
        order: pedido,
        payerEmail: pedido.cliente_email,
        expirationTime: "PT30M",
      });
      const resposta = await createPixOrder(config, corpo, pagamento.idempotency_key);
      const normalized = normalizeOrderResource(resposta);
      const aplicado = await aplicarRecursoMercadoPago({
        pedido,
        pagamento,
        normalized,
        origem: "criacao",
        evento: "pix_online_criado",
      });
      return json({
        ok: true,
        jaPago: aplicado.statusNovo === "aprovado",
        reutilizado: false,
        tipo: "pix",
        status: aplicado.statusNovo,
        pagamento: serializarPagamentoPublico(aplicado.pagamento),
        checkoutUrl: null,
      });
    }

    const backUrls = buildReturnUrls({
      appUrl: config.appUrl,
      pedidoId: pedido.id,
      token: pedido.tracking_token,
    });
    const corpo = buildPreferenceBody({
      order: pedido,
      payerEmail: pedido.cliente_email,
      backUrls,
      notificationUrl: config.webhookUrl,
    });
    const preferencia = await createPreference(config, corpo, pagamento.idempotency_key);
    if (!preferencia?.id) {
      throw new MercadoPagoError("Mercado Pago não retornou o ID da preferência.", 502);
    }
    const initPoint =
      config.ambiente === "sandbox"
        ? preferencia.sandbox_init_point ?? preferencia.init_point
        : preferencia.init_point ?? preferencia.sandbox_init_point;
    if (!initPoint) {
      throw new MercadoPagoError("Mercado Pago não retornou a URL do checkout.", 502);
    }

    const atualizado = await atualizarPagamento(pagamento.id, {
      status: "pendente",
      status_mp: "preference_created",
      tipo: "cartao",
      metodo: "checkout_pro",
      mp_preference_id: String(preferencia.id),
      init_point: preferencia.init_point ?? initPoint,
      sandbox_init_point: preferencia.sandbox_init_point ?? null,
      ultimo_erro: null,
      sincronizado_em: new Date().toISOString(),
    });
    pedido = { ...pedido, pagamento_provedor: "mercadopago", pagamento_online_tipo: "cartao" };

    await registrarEvento({
      pagamentoId: atualizado.id,
      pedidoId: pedido.id,
      origem: "criacao",
      evento: "checkout_pro_criado",
      statusAnterior: "pendente",
      statusNovo: "pendente",
      detalhe: {
        mp_preference_id: preferencia.id,
        ambiente: config.ambiente,
        metodo: "checkout_pro",
      },
    });
    await atualizarSnapshotImpressao(pedido.id);

    return json({
      ok: true,
      jaPago: false,
      reutilizado: false,
      tipo: "cartao",
      status: "pendente",
      checkoutUrl: initPoint,
      pagamento: serializarPagamentoPublico(atualizado),
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
    console.error("Falha ao criar pagamento online", {
      tipo,
      status: (error as { status?: number } | null)?.status ?? 0,
      message: safeErrorMessage(error),
    });
    return erro(safeErrorMessage(error, "Não foi possível iniciar o pagamento online."), statusHttp(error));
  }
});

import { getAdminClient } from "./supabase-admin.mjs";
import { getMpConfig } from "./mp-api.mjs";
import { amountsMatch, safeErrorMessage } from "./mp-core.mjs";

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
  }
}

function agora() {
  return new Date().toISOString();
}

export async function carregarConfigPagamento() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cardapio_exemplo_pagamento_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new PaymentError("Configuração de pagamentos indisponível. Aplique a migration nova.", 503);
  return data;
}

export async function validarOnlineHabilitado(tipo) {
  const config = await carregarConfigPagamento();
  if (!config?.mercadopago_ativo) {
    throw new PaymentError("Pagamento online desativado no painel.", 409);
  }
  if (tipo === "pix" && !config.pix_online_ativo) {
    throw new PaymentError("PIX online desativado no painel.", 409);
  }
  if (tipo === "cartao" && !config.cartao_online_ativo) {
    throw new PaymentError("Cartão online desativado no painel.", 409);
  }
  return config;
}

export async function carregarPedidoPorId(pedidoId) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cardapio_exemplo_pedidos")
    .select("*")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error) throw new PaymentError("Não foi possível consultar o pedido.", 500);
  if (!data) throw new PaymentError("Pedido não encontrado.", 404);
  return data;
}

export async function carregarPedidoPorToken(pedidoId, token) {
  if (!pedidoId || !token) throw new PaymentError("Pedido e token são obrigatórios.", 400);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cardapio_exemplo_pedidos")
    .select("*")
    .eq("id", pedidoId)
    .eq("tracking_token", token)
    .maybeSingle();
  if (error) throw new PaymentError("Não foi possível consultar o pedido.", 500);
  if (!data) throw new PaymentError("Pedido não encontrado ou token inválido.", 404);
  return data;
}

export async function carregarPagamentoDoPedido(pedidoId) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cardapio_exemplo_pagamentos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (error) throw new PaymentError("Pagamentos online indisponíveis. Aplique a migration nova.", 503);
  return data ?? null;
}

function limparCamposNovaTentativa() {
  return {
    status: "pendente",
    status_mp: null,
    metodo: null,
    mp_order_id: null,
    mp_payment_id: null,
    mp_preference_id: null,
    qr_code: null,
    qr_code_base64: null,
    ticket_url: null,
    init_point: null,
    sandbox_init_point: null,
    ultimo_erro: null,
    aprovado_em: null,
    expirado_em: null,
    sincronizado_em: null,
  };
}

export async function criarOuReutilizarTentativa({ pedido, tipo, ambiente, tentativa = 0 }) {
  const admin = getAdminClient();
  const existente = await carregarPagamentoDoPedido(pedido.id);

  if (existente) {
    if (existente.status === "aprovado") {
      return { pagamento: existente, reutilizado: true, jaPago: true };
    }
    if (existente.status === "pendente" || existente.status === "em_processamento") {
      if (existente.tipo !== tipo) {
        throw new PaymentError("Já existe um pagamento online pendente para este pedido. Conclua ou aguarde a expiração.", 409);
      }
      return { pagamento: existente, reutilizado: true, jaPago: false };
    }

    const patch = {
      ...limparCamposNovaTentativa(),
      ambiente,
      tipo,
      valor: Number(pedido.total),
      moeda: "BRL",
      mp_external_reference: `bompapoxa:${pedido.id}`,
      idempotency_key: crypto.randomUUID(),
    };
    const { data, error } = await admin
      .from("cardapio_exemplo_pagamentos")
      .update(patch)
      .eq("pedido_id", pedido.id)
      .select("*")
      .single();
    if (error) throw new PaymentError(safeErrorMessage(error), 500);
    return { pagamento: data, reutilizado: false, jaPago: false };
  }

  const registro = {
    pedido_id: pedido.id,
    ambiente,
    tipo,
    valor: Number(pedido.total),
    moeda: "BRL",
    mp_external_reference: `bompapoxa:${pedido.id}`,
    idempotency_key: crypto.randomUUID(),
    ...limparCamposNovaTentativa(),
  };
  const { data, error } = await admin
    .from("cardapio_exemplo_pagamentos")
    .insert(registro)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && tentativa < 1) {
      return criarOuReutilizarTentativa({ pedido, tipo, ambiente, tentativa: tentativa + 1 });
    }
    throw new PaymentError(safeErrorMessage(error), 500);
  }
  return { pagamento: data, reutilizado: false, jaPago: false };
}

export async function marcarPedidoComProvedor(pedidoId, tipo) {
  const admin = getAdminClient();
  const { error } = await admin
    .from("cardapio_exemplo_pedidos")
    .update({ pagamento_provedor: "mercadopago", pagamento_online_tipo: tipo })
    .eq("id", pedidoId);
  if (error) throw new PaymentError("Não foi possível atualizar a origem do pagamento.", 500);
}

export async function atualizarPagamento(pagamentoId, patch) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("cardapio_exemplo_pagamentos")
    .update(patch)
    .eq("id", pagamentoId)
    .select("*")
    .single();
  if (error) throw new PaymentError(safeErrorMessage(error), 500);
  return data;
}

/**
 * @param {{
 *   pagamentoId?: string | null,
 *   pedidoId?: string | null,
 *   origem: string,
 *   evento: string,
 *   statusAnterior?: string | null,
 *   statusNovo?: string | null,
 *   detalhe?: Record<string, unknown>
 * }} entrada
 */
export async function registrarEvento({
  pagamentoId = null,
  pedidoId = null,
  origem,
  evento,
  statusAnterior = null,
  statusNovo = null,
  detalhe = {},
}) {
  const admin = getAdminClient();
  const { error } = await admin.from("cardapio_exemplo_pagamento_eventos").insert({
    pagamento_id: pagamentoId,
    pedido_id: pedidoId,
    origem,
    evento,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    detalhe: detalhe && typeof detalhe === "object" ? detalhe : {},
  });
  if (error) {
    console.error("Falha ao registrar evento de pagamento", { evento, origem, code: error.code });
  }
}

export async function atualizarSnapshotImpressao(pedidoId) {
  const admin = getAdminClient();
  const { error } = await admin.rpc("cardapio_exemplo_atualizar_payload_fila_pedido", {
    p_pedido_id: pedidoId,
  });
  if (error) {
    console.error("Falha ao atualizar snapshot de impressão", { pedidoId, code: error.code });
  }
}

export async function carregarRecursoParaWebhook(normalized) {
  const admin = getAdminClient();
  let pedido = null;
  let pagamento = null;

  const referencia = String(normalized.externalReference ?? "");
  if (referencia.startsWith("bompapoxa:")) {
    const pedidoId = referencia.slice("bompapoxa:".length);
    const { data: pedidoData, error: pedidoError } = await admin
      .from("cardapio_exemplo_pedidos")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedidoError && pedidoData) {
      pedido = pedidoData;
      pagamento = await carregarPagamentoDoPedido(pedido.id);
    }
  }

  if (!pagamento) {
    if (normalized.mpOrderId) {
      const { data } = await admin
        .from("cardapio_exemplo_pagamentos")
        .select("*")
        .eq("mp_order_id", normalized.mpOrderId)
        .maybeSingle();
      pagamento = data ?? null;
    }
    if (!pagamento && normalized.mpPaymentId) {
      const { data } = await admin
        .from("cardapio_exemplo_pagamentos")
        .select("*")
        .eq("mp_payment_id", normalized.mpPaymentId)
        .maybeSingle();
      pagamento = data ?? null;
    }
    if (pagamento) pedido = await carregarPedidoPorId(pagamento.pedido_id);
  }

  return { pedido, pagamento };
}

export async function aplicarRecursoMercadoPago({ pedido, pagamento, normalized, origem, evento }) {
  if (!pedido || !pagamento) {
    throw new PaymentError("Pedido ou pagamento não localizado para a notificação.", 404);
  }
  const referenciaEsperada = `bompapoxa:${pedido.id}`;
  if (normalized.externalReference && normalized.externalReference !== referenciaEsperada) {
    throw new PaymentError("Referência externa divergente. Notificação ignorada por segurança.", 409);
  }
  if (normalized.amount !== null && normalized.amount !== undefined && !amountsMatch(pedido.total, normalized.amount)) {
    await marcarErroPagamento({
      pedido,
      pagamento,
      erro: `Valor divergente: pedido R$ ${Number(pedido.total).toFixed(2)} x Mercado Pago R$ ${Number(normalized.amount).toFixed(2)}.`,
      origem,
      evento: "valor_divergente",
    });
    throw new PaymentError("Valor do pagamento divergente do pedido. Pagamento não aprovado.", 409);
  }

  const statusAnterior = pagamento.status;
  const novoStatus = normalized.status;
  const tipo = normalized.tipo || pagamento.tipo;
  const agoraIso = agora();

  const patch = {
    status: novoStatus,
    status_mp: normalized.statusMp || null,
    metodo: normalized.metodo || pagamento.metodo,
    tipo,
    mp_order_id: normalized.mpOrderId ?? pagamento.mp_order_id,
    mp_payment_id: normalized.mpPaymentId ?? pagamento.mp_payment_id,
    ultimo_erro: null,
    sincronizado_em: agoraIso,
    aprovado_em:
      novoStatus === "aprovado" ? (pagamento.aprovado_em ?? agoraIso) : pagamento.aprovado_em,
    expirado_em: novoStatus === "expirado" ? agoraIso : pagamento.expirado_em,
  };
  if (normalized.qrCode) patch.qr_code = normalized.qrCode;
  if (normalized.qrCodeBase64) patch.qr_code_base64 = normalized.qrCodeBase64;
  if (normalized.ticketUrl) patch.ticket_url = normalized.ticketUrl;

  const pagamentoAtualizado = await atualizarPagamento(pagamento.id, patch);

  const admin = getAdminClient();
  const pedidoPatch = {
    pagamento_provedor: "mercadopago",
    pagamento_online_tipo: tipo,
  };
  const pedidoCancelado = pedido.status === "cancelado";
  if (!pedidoCancelado) {
    if (novoStatus === "aprovado") {
      pedidoPatch.status_pagamento = "pago";
    } else if (["cancelado", "expirado", "estornado"].includes(novoStatus)) {
      pedidoPatch.status_pagamento = "cancelado";
    } else if (pedido.status_pagamento !== "pago") {
      pedidoPatch.status_pagamento = "pendente";
    }
  }
  const { error: pedidoError } = await admin
    .from("cardapio_exemplo_pedidos")
    .update(pedidoPatch)
    .eq("id", pedido.id);
  if (pedidoError) {
    throw new PaymentError("Pagamento atualizado, mas o pedido não pôde ser sincronizado.", 500);
  }

  await registrarEvento({
    pagamentoId: pagamento.id,
    pedidoId: pedido.id,
    origem,
    evento: evento || "status_atualizado",
    statusAnterior,
    statusNovo: novoStatus,
    detalhe: {
      status_mp: normalized.statusMp,
      mp_order_id: normalized.mpOrderId ?? pagamento.mp_order_id,
      mp_payment_id: normalized.mpPaymentId ?? pagamento.mp_payment_id,
      valor: normalized.amount,
      pedido_cancelado: pedidoCancelado && novoStatus === "aprovado",
    },
  });
  await atualizarSnapshotImpressao(pedido.id);

  return { pagamento: pagamentoAtualizado, pedido, statusAnterior, statusNovo };
}

export async function marcarErroPagamento({ pedido, pagamento, erro, origem, evento = "erro_integracao" }) {
  const mensagem = safeErrorMessage(erro, "Erro na comunicação com o Mercado Pago.");
  if (pagamento) {
    try {
      await atualizarPagamento(pagamento.id, {
        status: "erro",
        ultimo_erro: mensagem,
        sincronizado_em: agora(),
      });
    } catch (falha) {
      console.error("Falha ao marcar pagamento com erro", { code: falha?.status ?? "desconhecido" });
    }
  }
  await registrarEvento({
    pagamentoId: pagamento?.id ?? null,
    pedidoId: pedido?.id ?? null,
    origem,
    evento,
    statusAnterior: pagamento?.status ?? null,
    statusNovo: "erro",
    detalhe: { erro: mensagem },
  });
  if (pedido?.id) await atualizarSnapshotImpressao(pedido.id);
}

export function serializarPagamentoPublico(pagamento) {
  if (!pagamento) return null;
  return {
    id: pagamento.id,
    pedido_id: pagamento.pedido_id,
    provedor: "mercadopago",
    ambiente: pagamento.ambiente,
    tipo: pagamento.tipo,
    status: pagamento.status,
    status_mp: pagamento.status_mp,
    metodo: pagamento.metodo,
    valor: Number(pagamento.valor),
    moeda: pagamento.moeda,
    mp_order_id: pagamento.mp_order_id,
    mp_payment_id: pagamento.mp_payment_id,
    mp_preference_id: pagamento.mp_preference_id,
    mp_external_reference: pagamento.mp_external_reference,
    qr_code: pagamento.qr_code,
    qr_code_base64: pagamento.qr_code_base64,
    ticket_url: pagamento.ticket_url,
    init_point: pagamento.init_point,
    sandbox_init_point: pagamento.sandbox_init_point,
    ultimo_erro: pagamento.ultimo_erro,
    erro: pagamento.ultimo_erro,
    aprovado_em: pagamento.aprovado_em,
    expirado_em: pagamento.expirado_em,
    sincronizado_em: pagamento.sincronizado_em,
    created_at: pagamento.created_at,
    updated_at: pagamento.updated_at,
  };
}

export function configuracaoMercadoPago() {
  return getMpConfig();
}

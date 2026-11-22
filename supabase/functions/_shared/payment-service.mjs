import { getAdminClient } from "./supabase-admin.mjs";
import { amountsMatchCents, parseOrderNsu, safeErrorMessage } from "./infinitepay-core.mjs";

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

export async function validarOnlineHabilitado() {
  const config = await carregarConfigPagamento();
  if (!config?.infinitepay_ativo) {
    throw new PaymentError("Pagamento online desativado no painel.", 409);
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
    status_gateway: null,
    metodo: null,
    gateway_order_id: null,
    gateway_payment_id: null,
    gateway_checkout_id: null,
    checkout_url: null,
    receipt_url: null,
    ultimo_erro: null,
    aprovado_em: null,
    expirado_em: null,
    sincronizado_em: null,
  };
}

export async function criarOuReutilizarTentativa({ pedido, ambiente = "producao", tipo = "online", tentativa = 0 }) {
  const admin = getAdminClient();
  const existente = await carregarPagamentoDoPedido(pedido.id);

  if (existente) {
    if (existente.status === "aprovado") {
      return { pagamento: existente, reutilizado: true, jaPago: true };
    }
    if (existente.status === "pendente" || existente.status === "em_processamento") {
      const referencia = existente.updated_at || existente.created_at;
      const idadeMs = referencia ? Date.now() - new Date(referencia).getTime() : 0;
      const linkExpirado = idadeMs > 35 * 60 * 1000;
      if (!linkExpirado) {
        return { pagamento: existente, reutilizado: true, jaPago: false };
      }
    }

    const patch = {
      ...limparCamposNovaTentativa(),
      ambiente,
      tipo,
      valor: Number(pedido.total),
      moeda: "BRL",
      gateway_external_reference: `bompapoxa:${pedido.id}`,
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
    gateway_external_reference: `bompapoxa:${pedido.id}`,
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
      return criarOuReutilizarTentativa({ pedido, ambiente, tipo, tentativa: tentativa + 1 });
    }
    throw new PaymentError(safeErrorMessage(error), 500);
  }
  return { pagamento: data, reutilizado: false, jaPago: false };
}

export async function marcarPedidoComProvedor(pedidoId, tipo = "online") {
  const admin = getAdminClient();
  const { error } = await admin
    .from("cardapio_exemplo_pedidos")
    .update({ pagamento_provedor: "infinitepay", pagamento_online_tipo: tipo })
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

  const pedidoId = parseOrderNsu(normalized.orderNsu);
  if (pedidoId) {
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
    if (normalized.transactionNsu) {
      const { data } = await admin
        .from("cardapio_exemplo_pagamentos")
        .select("*")
        .eq("gateway_payment_id", normalized.transactionNsu)
        .maybeSingle();
      pagamento = data ?? null;
    }
    if (!pagamento && normalized.slug) {
      const { data } = await admin
        .from("cardapio_exemplo_pagamentos")
        .select("*")
        .eq("gateway_checkout_id", normalized.slug)
        .maybeSingle();
      pagamento = data ?? null;
    }
    if (pagamento) pedido = await carregarPedidoPorId(pagamento.pedido_id);
  }

  return { pedido, pagamento };
}

export async function aplicarRecursoInfinitepay({ pedido, pagamento, normalized, origem, evento }) {
  if (!pedido || !pagamento) {
    throw new PaymentError("Pedido ou pagamento não localizado para a notificação.", 404);
  }

  const referenciaEsperada = String(pedido.id);
  const referenciaRecebida = parseOrderNsu(normalized.orderNsu ?? "");
  if (referenciaRecebida && referenciaRecebida !== referenciaEsperada) {
    throw new PaymentError("Referência externa divergente. Notificação ignorada por segurança.", 409);
  }
  if (normalized.amount !== null && normalized.amount !== undefined && !amountsMatchCents(pedido.total, normalized.amount)) {
    await marcarErroPagamento({
      pedido,
      pagamento,
      erro: `Valor divergente: pedido R$ ${Number(pedido.total).toFixed(2)} x InfinitePay R$ ${(Number(normalized.amount) / 100).toFixed(2)}.`,
      origem,
      evento: "valor_divergente",
    });
    throw new PaymentError("Valor do pagamento divergente do pedido. Pagamento não aprovado.", 409);
  }

  const statusAnterior = pagamento.status;
  const novoStatus = normalized.status || "pendente";
  const tipo = normalized.tipo && normalized.tipo !== "online" ? normalized.tipo : (pagamento.tipo ?? "online");
  const agoraIso = agora();

  const patch = {
    status: novoStatus,
    status_gateway: normalized.statusGateway ?? pagamento.status_gateway,
    metodo: normalized.metodo || pagamento.metodo,
    tipo,
    gateway_order_id: normalized.orderNsu ? String(normalized.orderNsu) : pagamento.gateway_order_id,
    gateway_payment_id: normalized.transactionNsu || pagamento.gateway_payment_id,
    gateway_checkout_id: normalized.slug || pagamento.gateway_checkout_id,
    ultimo_erro: null,
    sincronizado_em: agoraIso,
    aprovado_em: novoStatus === "aprovado" ? (pagamento.aprovado_em ?? agoraIso) : pagamento.aprovado_em,
    expirado_em: novoStatus === "expirado" ? agoraIso : pagamento.expirado_em,
  };
  if (normalized.checkoutUrl) patch.checkout_url = normalized.checkoutUrl;
  if (normalized.receiptUrl) patch.receipt_url = normalized.receiptUrl;

  const pagamentoAtualizado = await atualizarPagamento(pagamento.id, patch);

  const admin = getAdminClient();
  const pedidoPatch = {
    pagamento_provedor: "infinitepay",
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
      status_gateway: normalized.statusGateway,
      gateway_payment_id: normalized.transactionNsu || pagamento.gateway_payment_id,
      gateway_checkout_id: normalized.slug || pagamento.gateway_checkout_id,
      valor: normalized.amount,
      paid_amount: normalized.paidAmount,
      parcelas: normalized.installments,
      capture_method: normalized.captureMethod,
      pedido_cancelado: pedidoCancelado && novoStatus === "aprovado",
    },
  });
  await atualizarSnapshotImpressao(pedido.id);

  return { pagamento: pagamentoAtualizado, pedido, statusAnterior, statusNovo };
}

export async function marcarErroPagamento({ pedido, pagamento, erro, origem, evento = "erro_integracao" }) {
  const mensagem = safeErrorMessage(erro, "Erro na comunicação com a InfinitePay.");
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
    provedor: "infinitepay",
    ambiente: pagamento.ambiente,
    tipo: pagamento.tipo,
    status: pagamento.status,
    status_gateway: pagamento.status_gateway,
    metodo: pagamento.metodo,
    valor: Number(pagamento.valor),
    moeda: pagamento.moeda,
    gateway_order_id: pagamento.gateway_order_id,
    gateway_payment_id: pagamento.gateway_payment_id,
    gateway_checkout_id: pagamento.gateway_checkout_id,
    gateway_external_reference: pagamento.gateway_external_reference,
    checkout_url: pagamento.checkout_url,
    receipt_url: pagamento.receipt_url,
    ultimo_erro: pagamento.ultimo_erro,
    erro: pagamento.ultimo_erro,
    aprovado_em: pagamento.aprovado_em,
    expirado_em: pagamento.expirado_em,
    sincronizado_em: pagamento.sincronizado_em,
    created_at: pagamento.created_at,
    updated_at: pagamento.updated_at,
  };
}

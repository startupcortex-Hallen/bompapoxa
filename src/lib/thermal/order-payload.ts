import type { Configuracoes, Pedido } from "@/lib/types";
import type { TicketPayload } from "./ticket";

export function montarPayloadImpressao(pedido: Pedido, config?: Configuracoes): TicketPayload {
  return {
    pedido_id: pedido.id,
    numero: pedido.numero,
    criado_em: pedido.created_at,
    status: pedido.status,
    cliente_nome: pedido.cliente_nome,
    cliente_telefone: pedido.cliente_telefone,
    cliente_email: pedido.cliente_email,
    modalidade: pedido.modalidade,
    endereco: {
      cep: pedido.cep,
      endereco: pedido.endereco,
      numero: pedido.numero_endereco,
      complemento: pedido.complemento,
      bairro: pedido.bairro,
      cidade: pedido.cidade,
      referencia: pedido.referencia,
    },
    itens: pedido.itens.map((item) => ({
      nome: item.nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      adicionais: item.adicionais.map((adicional) => ({ nome: adicional.nome, preco: adicional.preco })),
      observacao: item.observacao,
    })),
    observacoes: pedido.observacoes,
    forma_pagamento: pedido.forma_pagamento,
    pagamento_provedor: pedido.pagamento_provedor,
    pagamento_online_tipo: pedido.pagamento_online_tipo,
    pagamento_status: pedido.status_pagamento,
    pagamento_online: pedido.pagamento
      ? {
          status: pedido.pagamento.status,
          status_gateway: pedido.pagamento.status_gateway,
          tipo: pedido.pagamento.tipo,
          metodo: pedido.pagamento.metodo,
          gateway_order_id: pedido.pagamento.gateway_order_id,
          gateway_payment_id: pedido.pagamento.gateway_payment_id,
          gateway_checkout_id: pedido.pagamento.gateway_checkout_id,
          receipt_url: pedido.pagamento.receipt_url,
        }
      : null,
    troco_para: pedido.troco_para,
    subtotal: pedido.subtotal,
    taxa_entrega: pedido.taxa_entrega,
    desconto: pedido.desconto,
    total: pedido.total,
    cupom_codigo: pedido.cupom_codigo,
    estabelecimento: {
      nome: config?.nome_estabelecimento ?? "BOM PA POXA",
      endereco: config?.endereco ?? null,
      bairro: config?.bairro ?? null,
      cidade: config?.cidade ?? null,
      telefone: config?.telefone ?? null,
      whatsapp: config?.whatsapp ?? null,
    },
  };
}

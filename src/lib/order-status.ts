import type { Modalidade, Pedido, StatusPedido } from "./types";

export const STATUS_LABEL: Record<StatusPedido, string> = {
  novo: "Recebido",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

export const STATUS_DESCRICAO: Record<StatusPedido, string> = {
  novo: "Recebemos seu pedido e já vamos começar.",
  em_preparo: "Sua comida está sendo preparada.",
  pronto: "Está pronta! Já já segue para você.",
  saiu_entrega: "O entregador está a caminho.",
  entregue: "Bom apetite! Obrigado pelo pedido.",
  retirado: "Pedido retirado. Bom apetite!",
  cancelado: "Este pedido foi cancelado.",
};

export const STATUS_ABERTOS: StatusPedido[] = ["novo", "em_preparo", "pronto", "saiu_entrega"];

export function ehFinal(status: StatusPedido): boolean {
  return status === "entregue" || status === "retirado" || status === "cancelado";
}

export function proximosStatus(pedido: Pick<Pedido, "status" | "modalidade">): StatusPedido[] {
  if (ehFinal(pedido.status) || pedido.status === "cancelado") return [];
  if (pedido.status === "novo") return ["em_preparo", "cancelado"];
  if (pedido.status === "em_preparo") return ["pronto", "cancelado"];
  if (pedido.status === "pronto") {
    return pedido.modalidade === "delivery" ? ["saiu_entrega", "cancelado"] : ["retirado", "cancelado"];
  }
  if (pedido.status === "saiu_entrega") return ["entregue", "cancelado"];
  return [];
}

export function etapasPedido(modalidade: Modalidade): StatusPedido[] {
  return modalidade === "delivery"
    ? ["novo", "em_preparo", "pronto", "saiu_entrega", "entregue"]
    : ["novo", "em_preparo", "pronto", "retirado"];
}

export function indiceEtapa(pedido: Pick<Pedido, "status" | "modalidade">): number {
  if (pedido.status === "cancelado") return -1;
  return etapasPedido(pedido.modalidade).indexOf(pedido.status);
}

export const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  delivery: "Entrega",
  retirada: "Retirada",
};

export const STATUS_PAGAMENTO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

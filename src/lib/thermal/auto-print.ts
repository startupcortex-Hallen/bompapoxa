export type PedidoParaImpressao = {
  id: string;
  numero: number;
  status: string;
  pagamento_provedor?: string | null;
  status_pagamento?: string | null;
};

export function pedidoElegivelParaImpressao(pedido: PedidoParaImpressao): boolean {
  if (pedido.status !== "novo") return false;
  if (pedido.pagamento_provedor === "infinitepay") return pedido.status_pagamento === "pago";
  return true;
}

export function selecionarPedidosNovos<T extends PedidoParaImpressao>(
  pedidos: T[],
  vistos: ReadonlySet<string>,
): T[] {
  return pedidos.filter((pedido) => pedidoElegivelParaImpressao(pedido) && !vistos.has(pedido.id));
}

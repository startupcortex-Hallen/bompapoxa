import { numero } from "./format";

export type AdicionalCarrinho = { id: string; nome: string; preco: number };

export type ItemCarrinho = {
  key: string;
  produtoId?: string;
  comboId?: string;
  comboEscolhas?: string[];
  nome: string;
  precoBase: number;
  adicionais: AdicionalCarrinho[];
  quantidade: number;
  observacao: string;
  imagemUrl?: string | null;
};

export type PayloadItemPedido = {
  produto_id?: string;
  combo_id?: string;
  quantidade: number;
  adicionais: string[];
  observacao?: string;
};

function chave(
  produtoId: string | undefined,
  comboId: string | undefined,
  comboEscolhas: string[] | undefined,
  adicionais: string[],
  observacao: string,
) {
  return [
    produtoId ?? "",
    comboId ?? "",
    [...(comboEscolhas ?? [])].sort().join("+"),
    [...adicionais].sort().join("+"),
    observacao.trim().toLowerCase(),
  ].join("|");
}

export function precoUnitario(item: Pick<ItemCarrinho, "precoBase" | "adicionais">): number {
  return Math.round((numero(item.precoBase) + item.adicionais.reduce((soma, a) => soma + numero(a.preco), 0)) * 100) / 100;
}

export function totalLinha(item: ItemCarrinho): number {
  return Math.round(precoUnitario(item) * item.quantidade * 100) / 100;
}

export function totalCarrinho(itens: ItemCarrinho[]): number {
  return Math.round(itens.reduce((soma, item) => soma + totalLinha(item), 0) * 100) / 100;
}

export function contarItens(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

export function adicionarItem(itens: ItemCarrinho[], novo: Omit<ItemCarrinho, "key">): ItemCarrinho[] {
  const chaveNova = chave(novo.produtoId, novo.comboId, novo.comboEscolhas, novo.adicionais.map((a) => a.id), novo.observacao);
  const existente = itens.find((item) => item.key === chaveNova);
  if (existente) {
    return itens.map((item) =>
      item.key === chaveNova ? { ...item, quantidade: Math.min(30, item.quantidade + novo.quantidade) } : item,
    );
  }
  return [...itens, { ...novo, key: chaveNova, quantidade: Math.min(30, novo.quantidade) }];
}

export function alterarQuantidade(itens: ItemCarrinho[], key: string, quantidade: number): ItemCarrinho[] {
  if (quantidade <= 0) return itens.filter((item) => item.key !== key);
  return itens.map((item) => (item.key === key ? { ...item, quantidade: Math.min(30, quantidade) } : item));
}

export function removerItem(itens: ItemCarrinho[], key: string): ItemCarrinho[] {
  return itens.filter((item) => item.key !== key);
}

export function paraPayload(itens: ItemCarrinho[]): PayloadItemPedido[] {
  return itens.map((item) => {
    const resumo = item.comboEscolhas?.length ? `Inclui: ${item.comboEscolhas.join(", ")}` : "";
    const observacao = [resumo, item.observacao.trim()].filter(Boolean).join(" | ");
    return {
      ...(item.produtoId ? { produto_id: item.produtoId } : {}),
      ...(item.comboId ? { combo_id: item.comboId } : {}),
      quantidade: item.quantidade,
      adicionais: item.adicionais.map((a) => a.id),
      ...(observacao ? { observacao: observacao.slice(0, 200) } : {}),
    };
  });
}

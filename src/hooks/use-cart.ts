import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adicionarItem,
  alterarQuantidade,
  contarItens,
  removerItem,
  totalCarrinho,
  type ItemCarrinho,
} from "@/lib/cart";

const CHAVE = "bompapoxa.carrinho.v1";

function carregar(): ItemCarrinho[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter((item): item is ItemCarrinho => {
      if (!item || typeof item !== "object") return false;
      const registro = item as Record<string, unknown>;
      return (
        typeof registro.key === "string" &&
        typeof registro.nome === "string" &&
        typeof registro.quantidade === "number" &&
        Array.isArray(registro.adicionais)
      );
    });
  } catch {
    return [];
  }
}

export function useCarrinho() {
  const [itens, setItens] = useState<ItemCarrinho[]>(carregar);

  useEffect(() => {
    try {
      if (itens.length) localStorage.setItem(CHAVE, JSON.stringify(itens));
      else localStorage.removeItem(CHAVE);
    } catch {
      // O carrinho continua funcionando em memória quando o armazenamento está bloqueado.
    }
  }, [itens]);

  const adicionar = useCallback((item: Omit<ItemCarrinho, "key">) => {
    setItens((atual) => adicionarItem(atual, item));
  }, []);

  const alterar = useCallback((key: string, quantidade: number) => {
    setItens((atual) => alterarQuantidade(atual, key, quantidade));
  }, []);

  const remover = useCallback((key: string) => {
    setItens((atual) => removerItem(atual, key));
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const subtotal = useMemo(() => totalCarrinho(itens), [itens]);
  const quantidade = useMemo(() => contarItens(itens), [itens]);

  return { itens, adicionar, alterar, remover, limpar, subtotal, quantidade };
}

export const chaveUltimoPedido = "bompapoxa.ultimoPedido.v1";

export type UltimoPedido = { id: string; token: string; numero: number; criadoEm: string };

export function salvarUltimoPedido(pedido: UltimoPedido) {
  try {
    localStorage.setItem(chaveUltimoPedido, JSON.stringify(pedido));
  } catch {
    // Sem persistência, o acompanhamento segue disponível pelo link.
  }
}

export function lerUltimoPedido(): UltimoPedido | null {
  try {
    const bruto = localStorage.getItem(chaveUltimoPedido);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as UltimoPedido;
    return dados?.id && dados?.token ? dados : null;
  } catch {
    return null;
  }
}

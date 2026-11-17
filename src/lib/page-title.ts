import { useEffect } from "react";

const NOME = "BOM PA POXA";

export function useTitulo(titulo?: string, descricao?: string) {
  useEffect(() => {
    document.title = !titulo || titulo === NOME ? `${NOME} — Cardápio digital` : `${titulo} — ${NOME}`;
    if (descricao) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", descricao);
    }
  }, [titulo, descricao]);
}

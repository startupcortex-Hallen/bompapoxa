import type { CSSProperties } from "react";

export const FONTES = {
  fraunces_figtree: {
    rotulo: "Fraunces + Figtree",
    display: '"Fraunces", Georgia, serif',
    sans: '"Figtree", system-ui, sans-serif',
  },
  bricolage_figtree: {
    rotulo: "Bricolage + Figtree",
    display: '"Bricolage Grotesque", system-ui, sans-serif',
    sans: '"Figtree", system-ui, sans-serif',
  },
  playfair_dm: {
    rotulo: "Playfair + DM Sans",
    display: '"Playfair Display", Georgia, serif',
    sans: '"DM Sans", system-ui, sans-serif',
  },
  bebas_figtree: {
    rotulo: "Bebas Neue + Figtree",
    display: '"Bebas Neue", Impact, sans-serif',
    sans: '"Figtree", system-ui, sans-serif',
  },
} as const;

export type Tipografia = keyof typeof FONTES;

export const PALETAS = [
  { nome: "Terracota", primaria: "#B23A2A", secundaria: "#F1E3CF", destaque: "#E8A33D", fundo: "#FAF5EC", texto: "#2A1710" },
  { nome: "Dendê", primaria: "#C0651B", secundaria: "#F5E6C8", destaque: "#D9A12C", fundo: "#FDF7EA", texto: "#321D0B" },
  { nome: "Verde folha", primaria: "#2F6B4F", secundaria: "#E2EBDD", destaque: "#D4A72C", fundo: "#F7F6EE", texto: "#17251C" },
  { nome: "Vinho", primaria: "#7C2D3E", secundaria: "#F0DFE2", destaque: "#C99A42", fundo: "#FBF4F3", texto: "#2C151A" },
  { nome: "Noite", primaria: "#D96B3B", secundaria: "#2C2622", destaque: "#EFB64B", fundo: "#1C1917", texto: "#F8F1E7" },
  { nome: "Cinema", primaria: "#E50914", secundaria: "#141414", destaque: "#D6A65C", fundo: "#090909", texto: "#FFFFFF" },
] as const;

export function validarHex(cor: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(cor);
}

export function luminancia(hex: string): number {
  const valor = validarHex(hex) ? hex.slice(1) : "000000";
  const n = Number.parseInt(valor, 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (canais[0] ?? 0) + 0.7152 * (canais[1] ?? 0) + 0.0722 * (canais[2] ?? 0);
}

export function textoSobre(cor: string): string {
  return luminancia(cor) > 0.45 ? "#1F140F" : "#FFF9F1";
}

function hexParaRgb(hex: string): [number, number, number] {
  const valor = validarHex(hex) ? hex.slice(1) : "000000";
  const numero = Number.parseInt(valor, 16);
  return [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255];
}

function misturar(base: string, outra: string, pesoOutra: number): string {
  const [r1, g1, b1] = hexParaRgb(base);
  const [r2, g2, b2] = hexParaRgb(outra);
  const misturarCanal = (a: number, b: number) => Math.round(a * (1 - pesoOutra) + b * pesoOutra);
  return `rgb(${misturarCanal(r1, r2)}, ${misturarCanal(g1, g2)}, ${misturarCanal(b1, b2)})`;
}

export function estiloTema(configuracoes: {
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_texto: string;
  tipografia: string;
}): CSSProperties {
  const fonte = FONTES[(configuracoes.tipografia as Tipografia) in FONTES ? (configuracoes.tipografia as Tipografia) : "fraunces_figtree"];
  const primaria = validarHex(configuracoes.cor_primaria) ? configuracoes.cor_primaria : "#B23A2A";
  const secundaria = validarHex(configuracoes.cor_secundaria) ? configuracoes.cor_secundaria : "#F1E3CF";
  const destaque = validarHex(configuracoes.cor_destaque) ? configuracoes.cor_destaque : "#E8A33D";
  const fundo = validarHex(configuracoes.cor_fundo) ? configuracoes.cor_fundo : "#FAF5EC";
  const texto = validarHex(configuracoes.cor_texto) ? configuracoes.cor_texto : "#2A1710";
  const cartao = misturar(fundo, texto, 0.06);
  const muted = misturar(fundo, texto, 0.1);
  const mutedFg = misturar(texto, fundo, 0.36);
  const borda = misturar(texto, fundo, 0.86);
  return {
    "--app-primary": primaria,
    "--app-primary-foreground": textoSobre(primaria),
    "--app-secondary": secundaria,
    "--app-accent": destaque,
    "--app-accent-foreground": textoSobre(destaque),
    "--app-background": fundo,
    "--app-foreground": texto,
    "--app-card": cartao,
    "--app-muted": muted,
    "--app-muted-foreground": mutedFg,
    "--app-border": borda,
    "--app-font-display": fonte.display,
    "--app-font-sans": fonte.sans,
    "--color-primary": primaria,
    "--color-primary-foreground": textoSobre(primaria),
    "--color-secondary": secundaria,
    "--color-secondary-foreground": textoSobre(secundaria),
    "--color-accent": destaque,
    "--color-accent-foreground": textoSobre(destaque),
    "--color-background": fundo,
    "--color-foreground": texto,
    "--color-card": cartao,
    "--color-card-foreground": texto,
    "--color-muted": muted,
    "--color-muted-foreground": mutedFg,
    "--color-border": borda,
    "--color-input": borda,
    "--color-ring": primaria,
  } as CSSProperties;
}

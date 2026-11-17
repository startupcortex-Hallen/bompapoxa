import { ImageIcon, Minus, Plus, Star } from "lucide-react";
import { moedaBRL } from "@/lib/format";
import type { Produto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function precoVigente(produto: Pick<Produto, "preco" | "preco_promocional">): number {
  return produto.preco_promocional ?? produto.preco;
}

export function Preco({
  produto,
  className,
  tamanho = "md",
}: {
  produto: Pick<Produto, "preco" | "preco_promocional">;
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const promo = produto.preco_promocional != null && produto.preco_promocional < produto.preco;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tamanho === "sm" && "text-sm",
          tamanho === "md" && "text-base",
          tamanho === "lg" && "text-xl",
        )}
      >
        {moedaBRL(precoVigente(produto))}
      </span>
      {promo ? <span className="text-xs text-muted-foreground line-through">{moedaBRL(produto.preco)}</span> : null}
    </span>
  );
}

export function ImagemProduto({
  url,
  nome,
  className,
  carregar = false,
}: {
  url: string | null | undefined;
  nome: string;
  className?: string;
  carregar?: boolean;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={nome}
        loading={carregar ? "eager" : "lazy"}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "relative grid h-full w-full place-items-center overflow-hidden bg-secondary text-secondary-foreground",
        className,
      )}
      aria-label={`Sem foto para ${nome}`}
    >
      <div className="absolute inset-0 opacity-40 pattern-hero" />
      <span className="relative font-display text-4xl font-semibold uppercase tracking-tight">{nome.slice(0, 1)}</span>
      <ImageIcon className="absolute bottom-3 right-3 h-4 w-4 opacity-35" />
    </div>
  );
}

export function Quantidade({
  valor,
  onChange,
  max = 30,
  min = 1,
  compacto = false,
}: {
  valor: number;
  onChange: (valor: number) => void;
  max?: number;
  min?: number;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border border-border bg-card",
        compacto ? "h-8" : "h-10",
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, valor - 1))}
        disabled={valor <= min}
        aria-label="Diminuir quantidade"
        className={cn("grid place-items-center rounded-l-full text-muted-foreground transition hover:bg-secondary disabled:opacity-40", compacto ? "h-8 w-8" : "h-10 w-10")}
      >
        <Minus className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span className={cn("min-w-7 text-center text-sm font-medium tabular-nums", compacto && "text-xs")}>{valor}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, valor + 1))}
        disabled={valor >= max}
        aria-label="Aumentar quantidade"
        className={cn("grid place-items-center rounded-r-full text-muted-foreground transition hover:bg-secondary disabled:opacity-40", compacto ? "h-8 w-8" : "h-10 w-10")}
      >
        <Plus className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

export function Estrelas({ nota, className }: { nota: number; className?: string }) {
  const arredondada = Math.round(nota);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-3.5 w-3.5", n <= arredondada ? "fill-accent text-accent" : "text-border")}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function AvisoFechado({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
      {mensagem}
    </div>
  );
}

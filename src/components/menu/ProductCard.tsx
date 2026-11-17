import { Flame, Plus, Timer } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import type { Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagemProduto, Preco, precoVigente } from "./common";

export function ProdutoCard({
  produto,
  aoAbrir,
  atraso = 0,
}: {
  produto: Produto;
  aoAbrir: (produto: Produto) => void;
  atraso?: number;
}) {
  const promo = produto.preco_promocional != null && produto.preco_promocional < produto.preco;
  return (
    <article
      className={cn(
        "card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        !produto.disponivel && "opacity-80",
      )}
      style={{ animationDelay: `${atraso}ms` }}
    >
      <button
        type="button"
        onClick={() => aoAbrir(produto)}
        className="relative block aspect-[16/10] w-full overflow-hidden text-left"
        aria-label={`Ver ${produto.nome}`}
      >
        <ImagemProduto url={produto.imagem_url} nome={produto.nome} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {promo ? <Badge cor="danger">Promoção</Badge> : null}
          {produto.destaque ? <Badge cor="accent">Destaque</Badge> : null}
        </div>
        {!produto.disponivel ? (
          <div className="absolute inset-0 grid place-items-center bg-black/55">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black">Esgotado</span>
          </div>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => aoAbrir(produto)} className="min-w-0 text-left">
            <h3 className="text-lg leading-snug transition group-hover:text-primary">{produto.nome}</h3>
            {produto.descricao ? (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{produto.descricao}</p>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => aoAbrir(produto)}
            aria-label={`Adicionar ${produto.nome}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-40"
            disabled={!produto.disponivel}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {produto.tempo_preparo_min ? (
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" /> {produto.tempo_preparo_min} min
            </span>
          ) : null}
          {produto.adicionais.length ? (
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3 w-3" /> {produto.adicionais.length} adicionais
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <Preco produto={produto} tamanho="md" />
          {promo ? <span className="text-[11px] font-medium text-danger">economize {Math.round((1 - precoVigente(produto) / produto.preco) * 100)}%</span> : null}
        </div>
      </div>
    </article>
  );
}

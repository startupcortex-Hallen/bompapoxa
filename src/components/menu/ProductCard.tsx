import { Flame, Plus, Timer } from "lucide-react";
import type { Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagemProduto, Preco, precoVigente } from "./common";

export function ProdutoCard({
  produto,
  aoAbrir,
  aoAdicionar,
}: {
  produto: Produto;
  aoAbrir: (produto: Produto) => void;
  aoAdicionar?: (produto: Produto) => void;
}) {
  const promo = produto.preco_promocional != null && produto.preco_promocional < produto.preco;
  const desconto = promo ? Math.round((1 - precoVigente(produto) / produto.preco) * 100) : 0;

  return (
    <article
      className={cn(
        "group card-hover flex h-full min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#141414] shadow-[0_24px_70px_-46px_rgba(0,0,0,0.95)]",
        "hover:border-primary/55",
        !produto.disponivel && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => aoAbrir(produto)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#0b0b0b] text-left"
        aria-label={`Ver ${produto.nome}`}
      >
        <ImagemProduto
          url={produto.imagem_url}
          nome={produto.nome}
          className="duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/25" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {promo ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-8px_rgba(229,9,20,0.8)]">
              Oferta
            </span>
          ) : null}
          {produto.destaque ? (
            <span className="rounded-full border border-gold/40 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold backdrop-blur">
              Mais pedido
            </span>
          ) : null}
        </div>
        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex translate-y-2 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/80 opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Ver detalhes
        </span>
        {!produto.disponivel ? (
          <div className="absolute inset-0 grid place-items-center bg-black/65 backdrop-blur-[2px]">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Esgotado
            </span>
          </div>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={() => aoAbrir(produto)} className="min-w-0 text-left">
          <h3 className="line-clamp-2 font-display text-[1.65rem] uppercase leading-[0.95] text-white transition group-hover:text-primary">
            {produto.nome}
          </h3>
          {produto.descricao ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/50">{produto.descricao}</p>
          ) : null}
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
          {produto.tempo_preparo_min ? (
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" /> {produto.tempo_preparo_min} min
            </span>
          ) : null}
          {produto.adicionais.length ? (
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3 w-3" /> Personalizável
            </span>
          ) : null}
          {promo ? <span className="text-gold">-{desconto}%</span> : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <Preco produto={produto} tamanho="lg" className="text-primary" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (aoAdicionar) aoAdicionar(produto);
              else aoAbrir(produto);
            }}
            aria-label={`Adicionar ${produto.nome} à sacola`}
            disabled={!produto.disponivel}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_-14px_rgba(229,9,20,0.9)] transition hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}

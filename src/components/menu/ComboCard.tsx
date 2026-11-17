import { Package, Plus } from "lucide-react";
import { moedaBRL } from "@/lib/format";
import type { Combo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagemProduto } from "./common";

export function ComboCard({
  combo,
  aoAbrir,
  aoAdicionar,
}: {
  combo: Combo;
  aoAbrir: (combo: Combo) => void;
  aoAdicionar?: (combo: Combo) => void;
}) {
  return (
    <article
      className={cn(
        "group card-hover flex h-full min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#141414] shadow-[0_24px_70px_-46px_rgba(0,0,0,0.95)]",
        "hover:border-gold/45",
        !combo.disponivel && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => aoAbrir(combo)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#0b0b0b] text-left"
        aria-label={`Ver ${combo.nome}`}
      >
        <ImagemProduto url={combo.imagem_url} nome={combo.nome} className="duration-700 group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/25" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-gold/40 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold backdrop-blur">
            Combo
          </span>
          {!combo.disponivel ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Esgotado
            </span>
          ) : null}
        </div>
        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex translate-y-2 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/80 opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Ver detalhes
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={() => aoAbrir(combo)} className="min-w-0 text-left">
          <h3 className="line-clamp-2 font-display text-[1.65rem] uppercase leading-[0.95] text-white transition group-hover:text-gold">
            {combo.nome}
          </h3>
          {combo.descricao ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/50">{combo.descricao}</p> : null}
        </button>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/35">
          <Package className="h-3 w-3 text-gold" />
          {combo.grupos.length ? "Combo configurável" : `${combo.itens.length} itens no combo`}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="text-xl font-semibold text-primary">{moedaBRL(combo.preco)}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (aoAdicionar) aoAdicionar(combo);
              else aoAbrir(combo);
            }}
            aria-label={combo.grupos.length ? `Montar ${combo.nome}` : `Adicionar ${combo.nome} à sacola`}
            disabled={!combo.disponivel}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_-14px_rgba(229,9,20,0.9)] transition hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {combo.grupos.length ? "Montar" : "Adicionar"}
          </button>
        </div>
      </div>
    </article>
  );
}

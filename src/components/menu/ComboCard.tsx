import { Package } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { moedaBRL } from "@/lib/format";
import type { Combo } from "@/lib/types";
import { ImagemProduto } from "./common";

export function ComboCard({ combo, aoAbrir }: { combo: Combo; aoAbrir: (combo: Combo) => void }) {
  return (
    <article className="card-hover group overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => aoAbrir(combo)} className="relative block aspect-[16/9] w-full" aria-label={`Ver ${combo.nome}`}>
        <ImagemProduto url={combo.imagem_url} nome={combo.nome} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge cor="accent">Combo</Badge>
          {!combo.disponivel ? <Badge cor="danger">Esgotado</Badge> : null}
        </div>
      </button>
      <div className="p-4">
        <button type="button" onClick={() => aoAbrir(combo)} className="text-left">
          <h3 className="text-lg leading-snug group-hover:text-primary">{combo.nome}</h3>
        </button>
        {combo.descricao ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{combo.descricao}</p> : null}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Package className="h-3 w-3" /> {combo.itens.length} itens
          </span>
          <span className="font-semibold">{moedaBRL(combo.preco)}</span>
        </div>
      </div>
    </article>
  );
}

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { moedaBRL } from "@/lib/format";
import type { Combo } from "@/lib/types";
import { ImagemProduto, Quantidade } from "./common";

export function ComboModal({
  combo,
  aberto,
  aoFechar,
  aoAdicionar,
  bloqueado,
}: {
  combo: Combo | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAdicionar: (dados: {
    comboId: string;
    nome: string;
    precoBase: number;
    quantidade: number;
    observacao: string;
    imagemUrl: string | null;
  }) => void;
  bloqueado: boolean;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setQuantidade(1);
    setObservacao("");
  }, [aberto, combo]);

  if (!combo) return null;

  const total = combo.preco * quantidade;

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={combo.nome} largura="max-w-2xl" className="theme-cinema">
      <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]">
          <ImagemProduto url={combo.imagem_url} nome={combo.nome} />
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge cor="accent">Combo</Badge>
            {!combo.disponivel ? <Badge cor="danger">Esgotado</Badge> : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {combo.descricao || "Um combo especial preparado para você."}
          </p>
          <p className="mt-4 text-2xl font-semibold text-primary">{moedaBRL(combo.preco)}</p>

          {combo.itens.length ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3.5">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Inclui
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {combo.itens.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.produto_nome ?? "Produto do combo"}</span>
                    <span className="text-muted-foreground">x{item.quantidade}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4">
            <Textarea
              label="Observação"
              placeholder="Alguma preferência para o combo?"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Quantidade valor={quantidade} onChange={setQuantidade} max={20} />
            <Button
              disabled={!combo.disponivel || bloqueado}
              className="uppercase tracking-[0.14em]"
              onClick={() => {
                aoAdicionar({
                  comboId: combo.id,
                  nome: combo.nome,
                  precoBase: combo.preco,
                  quantidade,
                  observacao,
                  imagemUrl: combo.imagem_url,
                });
                toast.success(`${combo.nome} adicionado à sacola.`);
                aoFechar();
              }}
            >
              Adicionar • {moedaBRL(total)}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

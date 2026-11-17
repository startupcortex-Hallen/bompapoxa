import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Minus, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { moedaBRL } from "@/lib/format";
import type { Combo, ComboGrupo, ComboOpcao } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagemProduto, Quantidade } from "./common";

type Selecao = Record<string, Record<string, number>>;

function totalDoGrupo(selecionados: Selecao, grupoId: string): number {
  return Object.values(selecionados[grupoId] ?? {}).reduce((soma, quantidade) => soma + quantidade, 0);
}

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
    comboEscolhas: string[];
  }) => void;
  bloqueado: boolean;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [selecionados, setSelecionados] = useState<Selecao>({});
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setQuantidade(1);
    setObservacao("");
    setSelecionados({});
    setAviso(null);
  }, [aberto, combo]);

  const grupos = useMemo(() => combo?.grupos ?? [], [combo]);

  const gruposOk = useMemo(
    () =>
      grupos.every((grupo) => {
        const total = totalDoGrupo(selecionados, grupo.id);
        const minimo = grupo.obrigatorio ? Math.max(grupo.min_qtd, 1) : grupo.min_qtd;
        return total >= minimo && total <= grupo.max_qtd;
      }),
    [grupos, selecionados],
  );

  const resumoItens = useMemo(() => {
    if (!combo) return [];
    const fixos = combo.itens.map((item) =>
      item.quantidade > 1 ? `${item.quantidade}x ${item.produto_nome ?? "Item do combo"}` : item.produto_nome ?? "Item do combo",
    );
    const escolhidos = grupos.flatMap((grupo) =>
      Object.entries(selecionados[grupo.id] ?? {}).flatMap(([opcaoId, count]) => {
        const opcao = grupo.opcoes.find((item) => item.id === opcaoId);
        if (!opcao || count <= 0) return [];
        const rotulo = opcao.rotulo || opcao.produto_nome || "Item do combo";
        if (opcao.quantidade > 1) return [rotulo];
        return [count > 1 ? `${count}x ${rotulo}` : rotulo];
      }),
    );
    return [...fixos, ...escolhidos];
  }, [combo, grupos, selecionados]);

  const adicionarOpcao = (grupo: ComboGrupo, opcao: ComboOpcao) => {
    if (opcao.produto_disponivel === false) return;
    const atual = selecionados[grupo.id] ?? {};
    const total = totalDoGrupo(selecionados, grupo.id);
    const quantidadeAtual = atual[opcao.id] ?? 0;
    setAviso(null);

    if (grupo.max_qtd === 1) {
      setSelecionados((anterior) => ({
        ...anterior,
        [grupo.id]: quantidadeAtual ? {} : { [opcao.id]: 1 },
      }));
      return;
    }

    if (total >= grupo.max_qtd) {
      setAviso(`Escolha no máximo ${grupo.max_qtd} opções em ${grupo.nome}.`);
      return;
    }

    setSelecionados((anterior) => ({
      ...anterior,
      [grupo.id]: { ...atual, [opcao.id]: quantidadeAtual + 1 },
    }));
  };

  const removerOpcao = (grupo: ComboGrupo, opcao: ComboOpcao) => {
    const atual = selecionados[grupo.id] ?? {};
    const quantidadeAtual = atual[opcao.id] ?? 0;
    if (!quantidadeAtual) return;
    const proximo = { ...atual };
    if (quantidadeAtual <= 1) delete proximo[opcao.id];
    else proximo[opcao.id] = quantidadeAtual - 1;
    setAviso(null);
    setSelecionados((anterior) => ({ ...anterior, [grupo.id]: proximo }));
  };

  if (!combo) return null;

  const total = combo.preco * quantidade;

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={combo.nome} largura="max-w-2xl" className="theme-cinema">
      <div className="grid gap-6 sm:grid-cols-[0.9fr_1.1fr]">
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

          {grupos.map((grupo) => {
            const escolhidos = selecionados[grupo.id] ?? {};
            const totalGrupo = totalDoGrupo(selecionados, grupo.id);
            const minimo = grupo.obrigatorio ? Math.max(grupo.min_qtd, 1) : grupo.min_qtd;
            const regra =
              grupo.min_qtd === grupo.max_qtd
                ? `Escolha ${grupo.min_qtd}`
                : `Escolha de ${grupo.min_qtd} a ${grupo.max_qtd}`;
            return (
              <div key={grupo.id} className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{grupo.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {grupo.obrigatorio ? "Obrigatório" : "Opcional"} • {regra}
                    </p>
                  </div>
                  <span className={cn("text-[11px] font-medium", totalGrupo >= minimo ? "text-success" : "text-gold")}>
                    {totalGrupo}/{grupo.max_qtd}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {grupo.opcoes.map((opcao) => {
                    const count = escolhidos[opcao.id] ?? 0;
                    const marcado = count > 0;
                    const indisponivel = opcao.produto_disponivel === false;
                    return (
                      <div key={opcao.id} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={indisponivel}
                          onClick={() => adicionarOpcao(grupo, opcao)}
                          className={cn(
                            "flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                            marcado ? "border-primary/70 bg-primary/10" : "border-white/10 bg-black/20 hover:border-gold/30",
                            indisponivel && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                                marcado ? "border-primary bg-primary text-primary-foreground" : "border-border",
                              )}
                            >
                              {marcado ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">
                                {opcao.quantidade > 1 ? `${opcao.quantidade}x ` : ""}
                                {opcao.rotulo || opcao.produto_nome || "Item do combo"}
                              </span>
                              {opcao.quantidade > 1 ? (
                                <span className="block text-[11px] text-muted-foreground">
                                  Quantidade inclusa no combo
                                </span>
                              ) : null}
                            </span>
                          </span>
                          {marcado ? <span className="shrink-0 text-xs font-semibold text-white">{count}x</span> : null}
                          {indisponivel ? <span className="shrink-0 text-[11px] text-muted-foreground">Indisponível</span> : null}
                        </button>
                        {count > 0 ? (
                          <button
                            type="button"
                            onClick={() => removerOpcao(grupo, opcao)}
                            aria-label={`Remover uma unidade de ${opcao.rotulo || opcao.produto_nome || "item"}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 transition hover:border-danger/40 hover:text-danger"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        ) : null}
                        {count > 0 && grupo.max_qtd > 1 && totalGrupo < grupo.max_qtd ? (
                          <button
                            type="button"
                            onClick={() => adicionarOpcao(grupo, opcao)}
                            aria-label={`Adicionar outra unidade de ${opcao.rotulo || opcao.produto_nome || "item"}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 transition hover:border-gold/40 hover:text-gold"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

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

          {aviso ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
            </p>
          ) : null}

          {!gruposOk ? (
            <p className="mt-3 text-xs text-gold">
              Complete as escolhas obrigatórias do combo para adicionar à sacola.
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Quantidade valor={quantidade} onChange={setQuantidade} max={20} />
            <Button
              disabled={!combo.disponivel || bloqueado || !gruposOk}
              className="uppercase tracking-[0.14em]"
              onClick={() => {
                aoAdicionar({
                  comboId: combo.id,
                  nome: combo.nome,
                  precoBase: combo.preco,
                  quantidade,
                  observacao,
                  imagemUrl: combo.imagem_url,
                  comboEscolhas: resumoItens,
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

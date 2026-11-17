import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Package, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir, ImageUpload } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Switch, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminCombosQuery, chaves } from "@/lib/queries";
import { excluirCombo, salvarCombo } from "@/lib/api";
import { moedaBRL, numero } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { Combo, Produto } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/combos")({
  component: CombosPage,
});

function CombosPage() {
  useTitulo("Combos");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminCombosQuery);
  const [editando, setEditando] = useState<Combo | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminCombos }),
      qc.invalidateQueries({ queryKey: chaves.adminProdutos }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  const combos = useMemo(() => [...(data?.combos ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)), [data?.combos]);

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os combos."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Combos"
        descricao="Monte ofertas com vários produtos por um preço especial."
        acao={
          <Button onClick={() => { setEditando(null); setModalAberto(true); }} disabled={!data?.produtos.length}>
            <Plus className="h-4 w-4" /> Novo combo
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-64 rounded-2xl" />)}</div>
      ) : combos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <article key={combo.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-[16/9] bg-secondary">
                {combo.imagem_url ? (
                  <img src={combo.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-secondary/60"><Package className="h-8 w-8 text-muted-foreground" /></div>
                )}
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {combo.destaque ? <Badge cor="accent"><Sparkles className="h-3 w-3" /> Destaque</Badge> : null}
                  {!combo.disponivel ? <Badge cor="danger">Esgotado</Badge> : null}
                  {!combo.ativo ? <Badge cor="danger">Oculto</Badge> : null}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg">{combo.nome}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{combo.descricao || "Sem descrição."}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{moedaBRL(combo.preco)}</span>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {combo.itens.slice(0, 4).map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="truncate">{item.produto_nome}</span>
                      <span>x{item.quantidade}</span>
                    </li>
                  ))}
                  {combo.itens.length > 4 ? <li>+ {combo.itens.length - 4} item(ns)</li> : null}
                </ul>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => { setEditando(combo); setModalAberto(true); }}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <BotaoExcluir
                    rotulo={`o combo ${combo.nome}`}
                    aoConfirmar={() => {
                      void (async () => {
                        try {
                          await excluirCombo(combo.id);
                          toast.success("Combo excluído.");
                          await invalidar();
                        } catch (erro) {
                          toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
                        }
                      })();
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EstadoVazio
          titulo="Nenhum combo cadastrado"
          descricao="Combine pratos e bebidas em uma oferta especial."
          icone={<Package className="h-6 w-6" />}
          acao={data?.produtos.length ? <Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo combo</Button> : undefined}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar combo" : "Novo combo"} largura="max-w-3xl">
        <ComboForm
          key={editando?.id ?? "novo"}
          combo={editando}
          produtos={data?.produtos ?? []}
          aoSalvar={async () => { setModalAberto(false); await invalidar(); }}
          aoCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}

function ComboForm({
  combo,
  produtos,
  aoSalvar,
  aoCancelar,
}: {
  combo: Combo | null;
  produtos: Produto[];
  aoSalvar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(combo?.nome ?? "");
  const [descricao, setDescricao] = useState(combo?.descricao ?? "");
  const [preco, setPreco] = useState(combo ? String(combo.preco).replace(".", ",") : "");
  const [imagem, setImagem] = useState<string | null>(combo?.imagem_url ?? null);
  const [disponivel, setDisponivel] = useState(combo?.disponivel ?? true);
  const [destaque, setDestaque] = useState(combo?.destaque ?? false);
  const [ativo, setAtivo] = useState(combo?.ativo ?? true);
  const [ordem, setOrdem] = useState(String(combo?.ordem ?? 0));
  const [selecionados, setSelecionados] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const item of combo?.itens ?? []) inicial[item.produto_id] = item.quantidade;
    return inicial;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alternar = (produtoId: string) => {
    setSelecionados((atual) => {
      const proximo = { ...atual };
      if (proximo[produtoId]) delete proximo[produtoId];
      else proximo[produtoId] = 1;
      return proximo;
    });
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do combo.");
    if (!numero(preco) || numero(preco) <= 0) return setErro("Informe um preço válido.");
    const itens = Object.entries(selecionados).map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
    if (!itens.length) return setErro("Escolha pelo menos um produto para o combo.");
    setSalvando(true);
    try {
      await salvarCombo(
        {
          ...(combo?.id ? { id: combo.id } : {}),
          nome,
          descricao,
          preco: numero(preco),
          imagem_url: imagem,
          disponivel,
          destaque,
          ativo,
          ordem: Number(ordem) || 0,
        },
        itens,
      );
      toast.success(combo ? "Combo atualizado." : "Combo criado.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Input label="Nome" obrigatorio value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Combo da casa" />
      <Textarea label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={2} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
        <Input label="Preço" obrigatorio value={preco} onChange={(event) => setPreco(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder="59,90" />
        <ImageUpload valor={imagem} onChange={setImagem} pasta="combos" rotulo="Foto do combo" aspecto="aspect-[16/9]" />
        <Input label="Ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(event.target.value)} />
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Produtos do combo</p>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {produtos.map((produto) => {
            const marcado = Boolean(selecionados[produto.id]);
            return (
              <div key={produto.id} className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2", marcado ? "bg-primary/5" : "hover:bg-secondary/50")}>
                <button type="button" onClick={() => alternar(produto.id)} className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", marcado ? "border-primary bg-primary text-primary-foreground" : "border-border")} aria-label={`Incluir ${produto.nome}`}>
                  {marcado ? <Check className="h-3 w-3" /> : null}
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">{produto.nome}</span>
                <span className="text-xs text-muted-foreground">{moedaBRL(produto.preco)}</span>
                {marcado ? (
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={selecionados[produto.id]}
                    onChange={(event) => setSelecionados((atual) => ({ ...atual, [produto.id]: Math.max(1, Number(event.target.value) || 1) }))}
                    className="h-8 w-16 rounded-md border border-border bg-card px-2 text-center text-xs"
                    aria-label={`Quantidade de ${produto.nome}`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-5 rounded-xl border border-border p-3.5">
        <label className="flex items-center gap-2 text-sm"><Switch checked={disponivel} onChange={setDisponivel} label="Combo disponível" /> Disponível</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={destaque} onChange={setDestaque} label="Combo em destaque" /> Destaque</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onChange={setAtivo} label="Combo visível" /> Visível</label>
      </div>

      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{combo ? "Salvar alterações" : "Criar combo"}</Button>
      </div>
    </form>
  );
}

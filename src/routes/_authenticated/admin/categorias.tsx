import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Sparkles, Tags } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir, ImageUpload } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Switch, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { adminCategoriasQuery, adminProdutosQuery, chaves } from "@/lib/queries";
import { excluirCategoria, reordenar, salvarCategoria } from "@/lib/api";
import { useTitulo } from "@/lib/page-title";
import type { Categoria } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: CategoriasPage,
});

function CategoriasPage() {
  useTitulo("Categorias");
  const qc = useQueryClient();
  const categorias = useQuery(adminCategoriasQuery);
  const produtos = useQuery(adminProdutosQuery);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const contagem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const produto of produtos.data?.produtos ?? []) {
      mapa.set(produto.categoria_id, (mapa.get(produto.categoria_id) ?? 0) + 1);
    }
    return mapa;
  }, [produtos.data]);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminCategorias }),
      qc.invalidateQueries({ queryKey: chaves.adminProdutos }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
      qc.invalidateQueries({ queryKey: ["layout-publico"] }),
    ]);
  };

  const mover = async (categoria: Categoria, direcao: -1 | 1) => {
    const lista = [...(categorias.data ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    const indice = lista.findIndex((item) => item.id === categoria.id);
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= lista.length) return;
    const [item] = lista.splice(indice, 1);
    if (!item) return;
    lista.splice(alvo, 0, item);
    try {
      await reordenar("categorias", lista.map((c) => c.id));
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível reordenar.");
    }
  };

  const alternar = async (categoria: Categoria, campo: "ativo" | "destaque") => {
    try {
      await salvarCategoria({ ...categoria, [campo]: !categoria[campo] });
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar.");
    }
  };

  const lista = useMemo(
    () => [...(categorias.data ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [categorias.data],
  );

  if (categorias.isError) {
    return (
      <EstadoErro
        mensagem={categorias.error instanceof Error ? categorias.error.message : "Não foi possível carregar as categorias."}
        aoTentarNovamente={() => void categorias.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Categorias"
        descricao="Organize as seções do cardápio. A ordem aqui é a ordem exibida ao cliente."
        acao={
          <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>
        }
      />

      {categorias.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((n) => <Skeleton key={n} className="h-24 rounded-2xl" />)}
        </div>
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((categoria, indice) => (
            <div key={categoria.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => void mover(categoria, -1)} disabled={indice === 0} aria-label="Mover para cima" className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-25">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => void mover(categoria, 1)} disabled={indice === lista.length - 1} aria-label="Mover para baixo" className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-25">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {categoria.imagem_url ? (
                  <img src={categoria.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground"><Tags className="h-5 w-5" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{categoria.nome}</p>
                  {categoria.destaque ? <Badge cor="accent"><Sparkles className="h-3 w-3" /> Destaque</Badge> : null}
                  {!categoria.ativo ? <Badge cor="danger">Oculta</Badge> : null}
                </div>
                {categoria.descricao ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{categoria.descricao}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{contagem.get(categoria.id) ?? 0} produto(s)</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  Visível <Switch checked={categoria.ativo} onChange={() => void alternar(categoria, "ativo")} label={`Visibilidade de ${categoria.nome}`} />
                </label>
                <button type="button" onClick={() => { setEditando(categoria); setModalAberto(true); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Editar ${categoria.nome}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <BotaoExcluir
                  rotulo={`a categoria ${categoria.nome}`}
                  aoConfirmar={() => {
                    void (async () => {
                      try {
                        await excluirCategoria(categoria.id);
                        toast.success("Categoria excluída.");
                        await invalidar();
                      } catch (erro) {
                        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
                      }
                    })();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EstadoVazio
          titulo="Nenhuma categoria ainda"
          descricao="Crie categorias como Entradas, Pratos, Bebidas e Sobremesas para organizar o cardápio."
          icone={<Tags className="h-6 w-6" />}
          acao={<Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Criar categoria</Button>}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar categoria" : "Nova categoria"}>
        <CategoriaForm
          key={editando?.id ?? "nova"}
          categoria={editando}
          aoSalvar={async () => {
            setModalAberto(false);
            await invalidar();
          }}
          aoCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}

function CategoriaForm({
  categoria,
  aoSalvar,
  aoCancelar,
}: {
  categoria: Categoria | null;
  aoSalvar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [descricao, setDescricao] = useState(categoria?.descricao ?? "");
  const [imagem, setImagem] = useState<string | null>(categoria?.imagem_url ?? null);
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true);
  const [destaque, setDestaque] = useState(categoria?.destaque ?? false);
  const [ordem, setOrdem] = useState(String(categoria?.ordem ?? 0));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome da categoria.");
      return;
    }
    setSalvando(true);
    try {
      await salvarCategoria({
        ...(categoria?.id ? { id: categoria.id } : {}),
        nome,
        descricao,
        imagem_url: imagem,
        ativo,
        destaque,
        ordem: Number(ordem) || 0,
      });
      toast.success(categoria ? "Categoria atualizada." : "Categoria criada.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Input label="Nome" obrigatorio value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Pratos principais" />
      <Textarea label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={3} placeholder="Uma frase curta sobre esta seção." />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <ImageUpload valor={imagem} onChange={setImagem} pasta="categorias" rotulo="Imagem da categoria" descricao="Opcional. Aparece no cardápio." aspecto="aspect-[16/9]" />
        <Input label="Ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-5 rounded-xl border border-border p-3.5">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={ativo} onChange={setAtivo} label="Categoria visível" /> Visível no cardápio
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={destaque} onChange={setDestaque} label="Categoria em destaque" /> Destaque
        </label>
      </div>
      {erro ? <p className={cn("rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger")}>{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{categoria ? "Salvar alterações" : "Criar categoria"}</Button>
      </div>
    </form>
  );
}

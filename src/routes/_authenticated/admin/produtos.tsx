import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir, ImageUpload } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminProdutosQuery, chaves } from "@/lib/queries";
import { atualizarProduto, excluirProduto, salvarProduto } from "@/lib/api";
import { enviarImagem } from "@/lib/image-upload";
import { moedaBRL, numero } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { Produto } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  useTitulo("Produtos");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminProdutosQuery);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [disponibilidade, setDisponibilidade] = useState("todos");
  const [editando, setEditando] = useState<Produto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminProdutos }),
      qc.invalidateQueries({ queryKey: chaves.adminAdicionais }),
      qc.invalidateQueries({ queryKey: chaves.adminCombos }),
      qc.invalidateQueries({ queryKey: chaves.adminCategorias }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  const categorias = useMemo(() => data?.categorias ?? [], [data?.categorias]);
  const nomeCategoria = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...(data?.produtos ?? [])]
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
      .filter((produto) => {
        if (categoriaFiltro !== "todas" && produto.categoria_id !== categoriaFiltro) return false;
        if (disponibilidade === "disponiveis" && (!produto.disponivel || !produto.ativo)) return false;
        if (disponibilidade === "indisponiveis" && produto.disponivel && produto.ativo) return false;
        if (!termo) return true;
        return [produto.nome, produto.descricao ?? "", ...produto.ingredientes].join(" ").toLowerCase().includes(termo);
      });
  }, [data?.produtos, busca, categoriaFiltro, disponibilidade]);

  const alternar = async (produto: Produto, campo: "disponivel" | "destaque" | "ativo") => {
    try {
      await atualizarProduto(produto.id, { [campo]: !produto[campo] });
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar.");
    }
  };

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os produtos."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Produtos"
        descricao="Cadastre os itens, preços, fotos e disponibilidade. As alterações aparecem no cardápio automaticamente."
        acao={
          <Button onClick={() => { setEditando(null); setModalAberto(true); }} disabled={!categorias.length}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />

      {!isLoading && !categorias.length ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-sm">
          Crie uma categoria antes de cadastrar produtos.{" "}
          <Link to="/admin/categorias" className="font-medium underline underline-offset-4">Ir para categorias</Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar produto…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select value={categoriaFiltro} onChange={(event) => setCategoriaFiltro(event.target.value)} className="h-10 rounded-full border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none">
          <option value="todas">Todas as categorias</option>
          {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
        </select>
        <select value={disponibilidade} onChange={(event) => setDisponibilidade(event.target.value)} className="h-10 rounded-full border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none">
          <option value="todos">Todos</option>
          <option value="disponiveis">Disponíveis</option>
          <option value="indisponiveis">Indisponíveis</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-24 rounded-2xl" />)}</div>
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((produto) => (
            <div key={produto.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {produto.imagem_url ? (
                  <img src={produto.imagem_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center font-display text-2xl">{produto.nome.slice(0, 1)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{produto.nome}</p>
                  {produto.destaque ? <Badge cor="accent"><Sparkles className="h-3 w-3" /> Destaque</Badge> : null}
                  {!produto.ativo ? <Badge cor="danger">Oculto</Badge> : null}
                  {produto.ativo && !produto.disponivel ? <Badge cor="danger">Esgotado</Badge> : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {nomeCategoria.get(produto.categoria_id) ?? "Sem categoria"} • {produto.adicionais.length} adicional(is)
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {moedaBRL(produto.preco_promocional ?? produto.preco)}
                  {produto.preco_promocional != null ? <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{moedaBRL(produto.preco)}</span> : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  Disponível <Switch checked={produto.disponivel} onChange={() => void alternar(produto, "disponivel")} label={`Disponibilidade de ${produto.nome}`} />
                </label>
                <button type="button" onClick={() => { setEditando(produto); setModalAberto(true); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Editar ${produto.nome}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <BotaoExcluir
                  rotulo={`o produto ${produto.nome}`}
                  aoConfirmar={() => {
                    void (async () => {
                      try {
                        await excluirProduto(produto.id);
                        toast.success("Produto excluído.");
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
          titulo={busca ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          descricao={busca ? "Tente outro nome ou limpe os filtros." : "Cadastre o primeiro item do cardápio com foto, descrição e preço."}
          icone={<UtensilsCrossed className="h-6 w-6" />}
          acao={!busca && categorias.length ? <Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo produto</Button> : undefined}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar produto" : "Novo produto"} largura="max-w-3xl">
        <ProdutoForm
          key={editando?.id ?? "novo"}
          produto={editando}
          categorias={categorias}
          aoSalvar={async () => { setModalAberto(false); await invalidar(); }}
          aoCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}

function ProdutoForm({
  produto,
  categorias,
  aoSalvar,
  aoCancelar,
}: {
  produto: Produto | null;
  categorias: { id: string; nome: string }[];
  aoSalvar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? categorias[0]?.id ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [preco, setPreco] = useState(produto ? String(produto.preco).replace(".", ",") : "");
  const [promocional, setPromocional] = useState(produto?.preco_promocional != null ? String(produto.preco_promocional).replace(".", ",") : "");
  const [imagem, setImagem] = useState<string | null>(produto?.imagem_url ?? null);
  const [galeria, setGaleria] = useState<string[]>(produto?.galeria ?? []);
  const [ingredientes, setIngredientes] = useState((produto?.ingredientes ?? []).join(", "));
  const [tempo, setTempo] = useState(produto?.tempo_preparo_min ? String(produto.tempo_preparo_min) : "");
  const [ordem, setOrdem] = useState(String(produto?.ordem ?? 0));
  const [disponivel, setDisponivel] = useState(produto?.disponivel ?? true);
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [minAdicionais, setMinAdicionais] = useState(String(produto?.min_adicionais ?? 0));
  const [maxAdicionais, setMaxAdicionais] = useState(String(produto?.max_adicionais ?? 20));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoGaleria, setEnviandoGaleria] = useState(false);

  const adicionarGaleria = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviandoGaleria(true);
    try {
      const url = await enviarImagem(arquivo, "produtos");
      setGaleria((atual) => [...atual, url]);
      toast.success("Foto adicionada à galeria.");
    } catch (erroGaleria) {
      toast.error(erroGaleria instanceof Error ? erroGaleria.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoGaleria(false);
    }
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do produto.");
    if (!categoriaId) return setErro("Escolha uma categoria.");
    const valor = numero(preco);
    if (!valor || valor <= 0) return setErro("Informe um preço válido.");
    const promo = promocional.trim() ? numero(promocional) : null;
    if (promo !== null && promo > valor) return setErro("O preço promocional não pode ser maior que o preço normal.");
    const minimo = Number(minAdicionais) || 0;
    const maximo = maxAdicionais.trim() ? Number(maxAdicionais) : 20;
    if (maximo < minimo) return setErro("O máximo de adicionais deve ser maior ou igual ao mínimo.");
    setSalvando(true);
    try {
      await salvarProduto({
        ...(produto?.id ? { id: produto.id } : {}),
        categoria_id: categoriaId,
        nome,
        descricao,
        preco: valor,
        preco_promocional: promo,
        imagem_url: imagem,
        galeria,
        ingredientes: ingredientes.split(",").map((item) => item.trim()).filter(Boolean),
        tempo_preparo_min: tempo.trim() ? Number(tempo) : null,
        ordem: Number(ordem) || 0,
        disponivel,
        destaque,
        ativo,
        min_adicionais: minimo,
        max_adicionais: maximo,
      });
      toast.success(produto ? "Produto atualizado." : "Produto criado.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome" obrigatorio value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Moqueca de peixe" />
        <Select label="Categoria" obrigatorio value={categoriaId} onChange={(event) => setCategoriaId(event.target.value)}>
          {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
        </Select>
      </div>
      <Textarea label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={3} maxLength={1200} placeholder="Conte o que vem no prato, o modo de preparo, o que torna especial…" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Preço" obrigatorio value={preco} onChange={(event) => setPreco(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder="39,90" />
        <Input label="Preço promocional" value={promocional} onChange={(event) => setPromocional(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder="Opcional" />
        <Input label="Tempo de preparo (min)" value={tempo} onChange={(event) => setTempo(event.target.value)} inputMode="numeric" placeholder="Ex.: 25" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <ImageUpload valor={imagem} onChange={setImagem} pasta="produtos" rotulo="Foto principal" descricao="Use uma foto nítida e apetitosa." />
        <div>
          <p className="text-xs font-medium text-muted-foreground">Galeria</p>
          <label className="mt-1.5 flex h-[calc(100%-1.5rem)] min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground hover:bg-secondary/55">
            {enviandoGaleria ? "Enviando…" : <><ImagePlus className="mb-1 h-5 w-5" /> Adicionar foto</>}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void adicionarGaleria(event.target.files?.[0])} disabled={enviandoGaleria} />
          </label>
          {galeria.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {galeria.map((url) => (
                <div key={url} className="relative h-14 w-16 overflow-hidden rounded-lg border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGaleria((atual) => atual.filter((item) => item !== url))}
                    className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl bg-black/60 text-white"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <Input label="Ingredientes" value={ingredientes} onChange={(event) => setIngredientes(event.target.value)} placeholder="Separados por vírgula: arroz, feijão, peixe, coentro…" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(event.target.value)} />
        <Input label="Mín. adicionais" type="number" min={0} value={minAdicionais} onChange={(event) => setMinAdicionais(event.target.value)} />
        <Input label="Máx. adicionais" type="number" min={0} value={maxAdicionais} onChange={(event) => setMaxAdicionais(event.target.value)} />
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2"><Switch checked={disponivel} onChange={setDisponivel} label="Produto disponível" /> Disponível</label>
          <label className="flex items-center gap-2"><Switch checked={destaque} onChange={setDestaque} label="Produto em destaque" /> Destaque</label>
          <label className="flex items-center gap-2"><Switch checked={ativo} onChange={setAtivo} label="Produto visível" /> Visível</label>
        </div>
      </div>
      <p className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        Para cadastrar opções e complementos deste produto, use a seção{" "}
        <Link to="/admin/adicionais" className="underline underline-offset-4">Adicionais</Link>.
      </p>
      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{produto ? "Salvar alterações" : "Criar produto"}</Button>
      </div>
    </form>
  );
}


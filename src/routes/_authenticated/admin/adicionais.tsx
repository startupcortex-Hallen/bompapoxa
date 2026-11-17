import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir, ImageUpload } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminAdicionaisQuery, chaves } from "@/lib/queries";
import { excluirAdicional, salvarAdicional } from "@/lib/api";
import { moedaBRL, numero } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { Adicional, Produto } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/adicionais")({
  component: AdicionaisPage,
});

function AdicionaisPage() {
  useTitulo("Adicionais");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminAdicionaisQuery);
  const [busca, setBusca] = useState("");
  const [produtoFiltro, setProdutoFiltro] = useState("todos");
  const [editando, setEditando] = useState<Adicional | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const produtos = useMemo(() => data?.produtos ?? [], [data?.produtos]);
  const nomeProduto = useMemo(() => new Map(produtos.map((p) => [p.id, p.nome])), [produtos]);
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...(data?.adicionais ?? [])]
      .filter((item) => produtoFiltro === "todos" || item.produto_id === produtoFiltro)
      .filter((item) => {
        if (!termo) return true;
        return [item.nome, item.grupo, item.descricao ?? ""].join(" ").toLowerCase().includes(termo);
      })
      .sort((a, b) => (nomeProduto.get(a.produto_id) ?? "").localeCompare(nomeProduto.get(b.produto_id) ?? "") || a.ordem - b.ordem);
  }, [data?.adicionais, busca, produtoFiltro, nomeProduto]);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminAdicionais }),
      qc.invalidateQueries({ queryKey: chaves.adminProdutos }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os adicionais."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Adicionais"
        descricao="Complementos, bordas, bebidas extras e opções obrigatórias por produto."
        acao={
          <Button onClick={() => { setEditando(null); setModalAberto(true); }} disabled={!produtos.length}>
            <Plus className="h-4 w-4" /> Novo adicional
          </Button>
        }
      />

      {!isLoading && !produtos.length ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 text-sm">
          Cadastre um produto antes de criar adicionais.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar adicional…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select value={produtoFiltro} onChange={(event) => setProdutoFiltro(event.target.value)} className="h-10 max-w-[260px] rounded-full border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none">
          <option value="todos">Todos os produtos</option>
          {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-20 rounded-2xl" />)}</div>
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((adicional) => (
            <div key={adicional.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {adicional.imagem_url ? <img src={adicional.imagem_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground"><SlidersHorizontal className="h-4 w-4" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{adicional.nome}</p>
                  <Badge>{adicional.grupo}</Badge>
                  {adicional.obrigatorio || adicional.min_qtd > 0 ? <Badge cor="danger">Obrigatório</Badge> : null}
                  {!adicional.disponivel ? <Badge cor="danger">Indisponível</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {nomeProduto.get(adicional.produto_id) ?? "Produto"} • {moedaBRL(adicional.preco)} • mín. {adicional.min_qtd}, máx. {adicional.max_qtd}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setEditando(adicional); setModalAberto(true); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Editar ${adicional.nome}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <BotaoExcluir
                  rotulo={`o adicional ${adicional.nome}`}
                  aoConfirmar={() => {
                    void (async () => {
                      try {
                        await excluirAdicional(adicional.id);
                        toast.success("Adicional excluído.");
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
          titulo="Nenhum adicional cadastrado"
          descricao="Crie grupos como “Bordas”, “Extras” ou “Molhos” e defina valores e limites."
          icone={<SlidersHorizontal className="h-6 w-6" />}
          acao={produtos.length ? <Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo adicional</Button> : undefined}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar adicional" : "Novo adicional"}>
        <AdicionalForm
          key={editando?.id ?? "novo"}
          adicional={editando}
          produtos={produtos}
          aoSalvar={async () => { setModalAberto(false); await invalidar(); }}
          aoCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}

function AdicionalForm({
  adicional,
  produtos,
  aoSalvar,
  aoCancelar,
}: {
  adicional: Adicional | null;
  produtos: Produto[];
  aoSalvar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const [produtoId, setProdutoId] = useState(adicional?.produto_id ?? produtos[0]?.id ?? "");
  const [nome, setNome] = useState(adicional?.nome ?? "");
  const [descricao, setDescricao] = useState(adicional?.descricao ?? "");
  const [preco, setPreco] = useState(adicional ? String(adicional.preco).replace(".", ",") : "");
  const [grupo, setGrupo] = useState(adicional?.grupo ?? "Opcionais");
  const [obrigatorio, setObrigatorio] = useState(adicional?.obrigatorio ?? false);
  const [min, setMin] = useState(String(adicional?.min_qtd ?? 0));
  const [max, setMax] = useState(String(adicional?.max_qtd ?? 10));
  const [disponivel, setDisponivel] = useState(adicional?.disponivel ?? true);
  const [ordem, setOrdem] = useState(String(adicional?.ordem ?? 0));
  const [imagem, setImagem] = useState<string | null>(adicional?.imagem_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!produtoId) return setErro("Escolha o produto.");
    if (!nome.trim()) return setErro("Informe o nome do adicional.");
    const minNum = Number(min) || 0;
    const maxNum = Number(max) || 0;
    if (maxNum < minNum) return setErro("O máximo deve ser maior ou igual ao mínimo.");
    if (maxNum < 1) return setErro("O máximo deve ser pelo menos 1.");
    setSalvando(true);
    try {
      await salvarAdicional({
        ...(adicional?.id ? { id: adicional.id } : {}),
        produto_id: produtoId,
        nome,
        descricao,
        preco: numero(preco),
        grupo,
        obrigatorio,
        min_qtd: minNum,
        max_qtd: maxNum,
        disponivel,
        ordem: Number(ordem) || 0,
        imagem_url: imagem,
      });
      toast.success(adicional ? "Adicional atualizado." : "Adicional criado.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Select label="Produto" obrigatorio value={produtoId} onChange={(event) => setProdutoId(event.target.value)}>
        {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome" obrigatorio value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Bordas de catupiry" />
        <Input label="Grupo" value={grupo} onChange={(event) => setGrupo(event.target.value)} placeholder="Ex.: Bordas, Extras, Molhos" hint="Opções do mesmo grupo respeitam os limites abaixo." />
      </div>
      <Textarea label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={2} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Preço" value={preco} onChange={(event) => setPreco(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder="0,00" />
        <Input label="Mínimo do grupo" type="number" min={0} value={min} onChange={(event) => setMin(event.target.value)} />
        <Input label="Máximo do grupo" type="number" min={1} value={max} onChange={(event) => setMax(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <ImageUpload valor={imagem} onChange={setImagem} pasta="produtos" rotulo="Foto do adicional" descricao="Opcional." aspecto="aspect-[16/9]" />
        <Input label="Ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-5 rounded-xl border border-border p-3.5">
        <label className="flex items-center gap-2 text-sm"><Switch checked={disponivel} onChange={setDisponivel} label="Adicional disponível" /> Disponível</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={obrigatorio} onChange={setObrigatorio} label="Adicional obrigatório" /> Obrigatório</label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Se qualquer opção do grupo estiver marcada como obrigatória, o cliente deverá escolher ao menos uma opção daquele grupo.
      </p>
      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{adicional ? "Salvar alterações" : "Criar adicional"}</Button>
      </div>
    </form>
  );
}

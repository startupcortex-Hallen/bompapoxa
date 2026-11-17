import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Image as ImageIcon, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir, ImageUpload } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminBannersQuery, chaves } from "@/lib/queries";
import { excluirBanner, reordenar, salvarBanner } from "@/lib/api";
import { useTitulo } from "@/lib/page-title";
import type { Banner } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersPage,
});

function BannersPage() {
  useTitulo("Banners");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminBannersQuery);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminBanners }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
    ]);
  };

  const lista = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo)),
    [data],
  );

  const mover = async (banner: Banner, direcao: -1 | 1) => {
    const atual = [...lista];
    const indice = atual.findIndex((item) => item.id === banner.id);
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= atual.length) return;
    const [item] = atual.splice(indice, 1);
    if (!item) return;
    atual.splice(alvo, 0, item);
    try {
      await reordenar("banners", atual.map((b) => b.id));
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível reordenar.");
    }
  };

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os banners."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Banners"
        descricao="Destaques visuais exibidos no topo e nas seções do cardápio."
        acao={<Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo banner</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[0, 1].map((n) => <Skeleton key={n} className="h-24 rounded-2xl" />)}</div>
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((banner, indice) => (
            <div key={banner.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => void mover(banner, -1)} disabled={indice === 0} className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-25" aria-label="Mover para cima"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => void mover(banner, 1)} disabled={indice === lista.length - 1} className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-25" aria-label="Mover para baixo"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {banner.imagem_url ? <img src={banner.imagem_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{banner.titulo}</p>
                  {!banner.ativo ? <Badge cor="danger">Oculto</Badge> : null}
                </div>
                {banner.subtitulo ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{banner.subtitulo}</p> : null}
                {banner.link_url ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{banner.link_url}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setEditando(banner); setModalAberto(true); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Editar ${banner.titulo}`}><Pencil className="h-4 w-4" /></button>
                <BotaoExcluir
                  rotulo={`o banner ${banner.titulo}`}
                  aoConfirmar={() => {
                    void (async () => {
                      try {
                        await excluirBanner(banner.id);
                        toast.success("Banner excluído.");
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
          titulo="Nenhum banner cadastrado"
          descricao="Use banners para divulgar promoções, novidades ou a identidade da casa."
          icone={<ImageIcon className="h-6 w-6" />}
          acao={<Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo banner</Button>}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar banner" : "Novo banner"}>
        <BannerForm
          key={editando?.id ?? "novo"}
          banner={editando}
          aoSalvar={async () => { setModalAberto(false); await invalidar(); }}
          aoCancelar={() => setModalAberto(false)}
        />
      </Modal>
    </div>
  );
}

function BannerForm({ banner, aoSalvar, aoCancelar }: { banner: Banner | null; aoSalvar: () => Promise<void>; aoCancelar: () => void }) {
  const [titulo, setTitulo] = useState(banner?.titulo ?? "");
  const [subtitulo, setSubtitulo] = useState(banner?.subtitulo ?? "");
  const [imagem, setImagem] = useState<string | null>(banner?.imagem_url ?? null);
  const [link, setLink] = useState(banner?.link_url ?? "");
  const [ordem, setOrdem] = useState(String(banner?.ordem ?? 0));
  const [ativo, setAtivo] = useState(banner?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!titulo.trim()) return setErro("Informe o título do banner.");
    setSalvando(true);
    try {
      await salvarBanner({
        ...(banner?.id ? { id: banner.id } : {}),
        titulo,
        subtitulo,
        imagem_url: imagem,
        link_url: link,
        ordem: Number(ordem) || 0,
        ativo,
      });
      toast.success(banner ? "Banner atualizado." : "Banner criado.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Input label="Título" obrigatorio value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex.: Sexta do acarajé" />
      <Input label="Subtítulo" value={subtitulo} onChange={(event) => setSubtitulo(event.target.value)} placeholder="Uma frase de apoio" />
      <ImageUpload valor={imagem} onChange={setImagem} pasta="banners" rotulo="Imagem do banner" descricao="Recomendado: 1600 × 900 px." />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Input label="Link (opcional)" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" />
        <Input label="Ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(event.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onChange={setAtivo} label="Banner visível" /> Visível no cardápio</label>
      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{banner ? "Salvar alterações" : "Criar banner"}</Button>
      </div>
    </form>
  );
}

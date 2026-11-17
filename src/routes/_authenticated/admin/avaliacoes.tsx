import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Estrelas } from "@/components/menu/common";
import { adminAvaliacoesQuery, chaves } from "@/lib/queries";
import { aprovarAvaliacao, excluirAvaliacao } from "@/lib/api";
import { dataHoraBR } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { Avaliacao } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/avaliacoes")({
  component: AvaliacoesPage,
});

type Filtro = "pendentes" | "aprovadas" | "todas";

function AvaliacoesPage() {
  useTitulo("Avaliações");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminAvaliacoesQuery);
  const [filtro, setFiltro] = useState<Filtro>("pendentes");

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminAvaliacoes }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  const lista = useMemo(() => {
    const todas = data ?? [];
    if (filtro === "pendentes") return todas.filter((item) => !item.aprovado);
    if (filtro === "aprovadas") return todas.filter((item) => item.aprovado);
    return todas;
  }, [data, filtro]);

  const media = data?.length ? data.reduce((soma, item) => soma + item.nota, 0) / data.length : 0;
  const pendentes = (data ?? []).filter((item) => !item.aprovado).length;

  const moderar = async (avaliacao: Avaliacao, aprovado: boolean) => {
    try {
      await aprovarAvaliacao(avaliacao.id, aprovado);
      toast.success(aprovado ? "Avaliação publicada." : "Avaliação ocultada.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar.");
    }
  };

  const remover = async (avaliacao: Avaliacao) => {
    if (!window.confirm("Excluir esta avaliação? Esta ação não pode ser desfeita.")) return;
    try {
      await excluirAvaliacao(avaliacao.id);
      toast.success("Avaliação excluída.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
    }
  };

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar as avaliações."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Avaliações"
        descricao="Modere os comentários dos clientes. Só as avaliações aprovadas aparecem no cardápio."
        acao={
          data?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{media.toFixed(1)}</span>
              <span>({data.length})</span>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {([
          ["pendentes", `Pendentes${pendentes ? ` (${pendentes})` : ""}`],
          ["aprovadas", "Aprovadas"],
          ["todas", "Todas"],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-medium transition",
              filtro === valor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-28 rounded-2xl" />)}</div>
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((avaliacao) => (
            <article key={avaliacao.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Estrelas nota={avaliacao.nota} />
                    <Badge cor={avaliacao.aprovado ? "success" : "accent"}>{avaliacao.aprovado ? "Publicada" : "Aguardando"}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{avaliacao.comentario || "Sem comentário."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {avaliacao.cliente_nome ?? "Cliente"} • Pedido #{avaliacao.pedido_id.slice(0, 8)} • {dataHoraBR(avaliacao.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {avaliacao.aprovado ? (
                    <Button variant="outline" size="sm" onClick={() => void moderar(avaliacao, false)}>
                      <EyeOff className="h-3.5 w-3.5" /> Ocultar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void moderar(avaliacao, true)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => void remover(avaliacao)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EstadoVazio
          titulo={filtro === "pendentes" ? "Nenhuma avaliação pendente" : "Nenhuma avaliação"}
          descricao="As avaliações são enviadas pelos clientes depois da entrega ou retirada do pedido."
          icone={<Star className="h-6 w-6" />}
        />
      )}
    </div>
  );
}

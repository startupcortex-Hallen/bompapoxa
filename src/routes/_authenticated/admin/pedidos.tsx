import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  MapPin,
  Search,
  Store,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";
import { StatusPagamentoBadge, StatusPedidoBadge } from "@/components/admin/status";
import { Badge, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { adminPedidosQuery, chaves } from "@/lib/queries";
import { atualizarPagamentoPedido, atualizarStatusPedido } from "@/lib/api";
import { dataHoraBR, horaBR, moedaBRL, tempoRelativo } from "@/lib/format";
import { FORMA_PAGAMENTO_LABEL, MODALIDADE_LABEL, STATUS_DESCRICAO, STATUS_LABEL, proximosStatus } from "@/lib/order-status";
import { useTitulo } from "@/lib/page-title";
import type { Pedido, StatusPedido } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: PedidosPage,
});

type Filtro = "andamento" | "novos" | "finalizados" | "cancelados" | "todos";

const ROTULO_ACAO: Record<StatusPedido, string> = {
  novo: "Recebido",
  em_preparo: "Iniciar preparo",
  pronto: "Marcar pronto",
  saiu_entrega: "Saiu para entrega",
  entregue: "Marcar entregue",
  retirado: "Marcar retirado",
  cancelado: "Cancelar pedido",
};

function PedidosPage() {
  useTitulo("Pedidos");
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(adminPedidosQuery);
  const [filtro, setFiltro] = useState<Filtro>("andamento");
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminPedidos }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((pedido) => {
      if (filtro === "andamento" && !["novo", "em_preparo", "pronto", "saiu_entrega"].includes(pedido.status)) return false;
      if (filtro === "novos" && pedido.status !== "novo") return false;
      if (filtro === "finalizados" && !["entregue", "retirado"].includes(pedido.status)) return false;
      if (filtro === "cancelados" && pedido.status !== "cancelado") return false;
      if (!termo) return true;
      return [String(pedido.numero), pedido.cliente_nome, pedido.cliente_telefone].join(" ").toLowerCase().includes(termo);
    });
  }, [data, filtro, busca]);

  const contagem = useMemo(() => {
    const todos = data ?? [];
    return {
      andamento: todos.filter((p) => ["novo", "em_preparo", "pronto", "saiu_entrega"].includes(p.status)).length,
      novos: todos.filter((p) => p.status === "novo").length,
      finalizados: todos.filter((p) => ["entregue", "retirado"].includes(p.status)).length,
      cancelados: todos.filter((p) => p.status === "cancelado").length,
      todos: todos.length,
    };
  }, [data]);

  const selecionado = useMemo(() => (data ?? []).find((pedido) => pedido.id === selecionadoId) ?? null, [data, selecionadoId]);

  const mudarStatus = async (pedido: Pedido, status: StatusPedido) => {
    if (status === "cancelado" && !window.confirm(`Cancelar o pedido #${pedido.numero}?`)) return;
    try {
      await atualizarStatusPedido(pedido.id, status);
      toast.success(`Pedido #${pedido.numero}: ${STATUS_LABEL[status].toLowerCase()}.`);
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o pedido.");
    }
  };

  const marcarPago = async (pedido: Pedido) => {
    try {
      await atualizarPagamentoPedido(pedido.id, pedido.status_pagamento === "pago" ? "pendente" : "pago");
      toast.success(pedido.status_pagamento === "pago" ? "Pagamento reaberto." : "Pagamento confirmado.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o pagamento.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Pedidos"
        descricao="Acompanhe a cozinha e atualize cada pedido. A lista é atualizada automaticamente a cada 15 segundos."
        acao={
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", isFetching ? "bg-accent" : "bg-success")} />
            {isFetching ? "Atualizando…" : "Atualizado"}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por número, nome ou telefone…"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button type="button" onClick={() => void refetch()} className="h-10 rounded-full border border-border bg-card px-4 text-xs text-muted-foreground hover:bg-secondary">
          Atualizar agora
        </button>
      </div>

      <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {([
          ["andamento", `Em andamento${contagem.andamento ? ` (${contagem.andamento})` : ""}`],
          ["novos", `Novos${contagem.novos ? ` (${contagem.novos})` : ""}`],
          ["finalizados", "Finalizados"],
          ["cancelados", "Cancelados"],
          ["todos", "Todos"],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
              filtro === valor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-28 rounded-2xl" />)}</div>
      ) : isError ? (
        <EstadoVazio titulo="Não foi possível carregar os pedidos" descricao={error instanceof Error ? error.message : "Tente novamente."} acao={<Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>} />
      ) : lista.length ? (
        <div className="space-y-2">
          {lista.map((pedido) => {
            const proximos = proximosStatus(pedido).filter((status) => status !== "cancelado");
            const podeCancelar = !["entregue", "retirado", "cancelado"].includes(pedido.status);
            return (
              <article key={pedido.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">#{pedido.numero}</p>
                      <StatusPedidoBadge status={pedido.status} />
                      <StatusPagamentoBadge status={pedido.status_pagamento} />
                      <Badge>{pedido.modalidade === "delivery" ? <><Bike className="h-3 w-3" /> Entrega</> : <><Store className="h-3 w-3" /> Retirada</>}</Badge>
                    </div>
                    <p className="mt-1 text-sm">{pedido.cliente_nome} • {pedido.cliente_telefone}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dataHoraBR(pedido.created_at)} • {tempoRelativo(pedido.created_at)} • {pedido.itens.length} item(ns) • {FORMA_PAGAMENTO_LABEL[pedido.forma_pagamento]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{moedaBRL(pedido.total)}</p>
                    <button type="button" onClick={() => setSelecionadoId(pedido.id)} className="mt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                      Ver detalhes
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {proximos.map((status) => (
                    <Button key={status} size="sm" variant={status === "pronto" ? "accent" : "primary"} onClick={() => void mudarStatus(pedido, status)}>
                      {ROTULO_ACAO[status]} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                  {pedido.status_pagamento !== "pago" && pedido.status !== "cancelado" ? (
                    <Button size="sm" variant="outline" onClick={() => void marcarPago(pedido)}>
                      <CircleDollarSign className="h-3.5 w-3.5" /> Marcar pago
                    </Button>
                  ) : null}
                  {podeCancelar ? (
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => void mudarStatus(pedido, "cancelado")}>
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  ) : null}
                  <button type="button" onClick={() => setSelecionadoId(pedido.id)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                    Abrir detalhes
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EstadoVazio
          titulo={busca ? "Nenhum pedido encontrado" : "Nenhum pedido neste filtro"}
          descricao={busca ? "Tente outro número, nome ou telefone." : "Os pedidos aparecem aqui automaticamente quando os clientes finalizarem a compra."}
          icone={<Clock className="h-6 w-6" />}
        />
      )}

      <Modal aberto={Boolean(selecionado)} aoFechar={() => setSelecionadoId(null)} titulo={selecionado ? `Pedido #${selecionado.numero}` : "Pedido"} largura="max-w-3xl">
        {selecionado ? (
          <DetalhePedido
            pedido={selecionado}
            aoMudarStatus={(status) => void mudarStatus(selecionado, status)}
            aoMarcarPago={() => void marcarPago(selecionado)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function DetalhePedido({ pedido, aoMudarStatus, aoMarcarPago }: { pedido: Pedido; aoMudarStatus: (status: StatusPedido) => void; aoMarcarPago: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/35 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPedidoBadge status={pedido.status} />
          <StatusPagamentoBadge status={pedido.status_pagamento} />
          <Badge>{MODALIDADE_LABEL[pedido.modalidade]}</Badge>
        </div>
        <p className="text-xl font-semibold">{moedaBRL(pedido.total)}</p>
      </div>
      <p className="text-sm text-muted-foreground">{STATUS_DESCRICAO[pedido.status]}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Cliente</p>
          <p className="mt-1 text-sm">{pedido.cliente_nome}</p>
          <p className="text-sm text-muted-foreground">{pedido.cliente_telefone}</p>
          {pedido.cliente_email ? <p className="text-sm text-muted-foreground">{pedido.cliente_email}</p> : null}
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {pedido.modalidade === "delivery" ? <MapPin className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
            {pedido.modalidade === "delivery" ? "Endereço de entrega" : "Retirada no local"}
          </p>
          {pedido.modalidade === "delivery" ? (
            <p className="mt-1 text-sm">
              {[pedido.endereco, pedido.numero_endereco, pedido.complemento].filter(Boolean).join(", ")}
              <br />
              {[pedido.bairro, pedido.cidade, pedido.cep].filter(Boolean).join(" • ")}
              {pedido.referencia ? <><br />Ref.: {pedido.referencia}</> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Cliente retira no estabelecimento.</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Itens</p>
        <ul className="mt-1 divide-y divide-border rounded-xl border border-border px-4">
          {pedido.itens.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{item.quantidade}x {item.nome}</p>
                {item.adicionais.length ? <p className="text-xs text-muted-foreground">{item.adicionais.map((a) => a.nome).join(" • ")}</p> : null}
                {item.observacao ? <p className="text-xs italic text-muted-foreground">“{item.observacao}”</p> : null}
              </div>
              <span className="shrink-0">{moedaBRL(item.preco_unitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{moedaBRL(pedido.subtotal)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>{moedaBRL(pedido.taxa_entrega)}</span></div>
          {pedido.desconto > 0 ? <div className="flex justify-between text-success"><span>Desconto {pedido.cupom_codigo ? `(${pedido.cupom_codigo})` : ""}</span><span>− {moedaBRL(pedido.desconto)}</span></div> : null}
          <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{moedaBRL(pedido.total)}</span></div>
        </div>
      </div>

      {pedido.observacoes ? (
        <div className="rounded-xl bg-secondary/35 p-4 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Observações</p>
          <p className="mt-1">{pedido.observacoes}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Histórico</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(pedido.historico ?? []).map((h, indice) => (
            <li key={`${h.created_at}-${indice}`} className="flex justify-between gap-3 text-muted-foreground">
              <span>{STATUS_LABEL[h.status_novo]}</span>
              <span>{horaBR(h.created_at)} • {dataHoraBR(h.created_at)}</span>
            </li>
          ))}
          {!pedido.historico?.length ? <li className="text-muted-foreground">Sem eventos registrados.</li> : null}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {proximosStatus(pedido).filter((status) => status !== "cancelado").map((status) => (
          <Button key={status} onClick={() => aoMudarStatus(status)}>
            <CheckCircle2 className="h-4 w-4" /> {ROTULO_ACAO[status]}
          </Button>
        ))}
        {pedido.status_pagamento !== "pago" && pedido.status !== "cancelado" ? (
          <Button variant="outline" onClick={aoMarcarPago}><CircleDollarSign className="h-4 w-4" /> Marcar pago</Button>
        ) : null}
        {!["entregue", "retirado", "cancelado"].includes(pedido.status) ? (
          <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => aoMudarStatus("cancelado")}>
            <XCircle className="h-4 w-4" /> Cancelar pedido
          </Button>
        ) : null}
      </div>
    </div>
  );
}

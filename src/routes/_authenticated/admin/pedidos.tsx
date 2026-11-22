import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bike,
  Bluetooth,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";
import { StatusPagamentoBadge, StatusPedidoBadge } from "@/components/admin/status";
import { Badge, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminConfiguracoesQuery, adminPedidosQuery, chaves } from "@/lib/queries";
import { atualizarPagamentoPedido, atualizarStatusPedido, enfileirarReimpressao, excluirPedido } from "@/lib/api";
import { sincronizarPagamentoOnline } from "@/lib/online-payments";
import { montarPayloadImpressao } from "@/lib/thermal/order-payload";
import {
  atualizarConfigImpressora,
  carregarConfigImpressora,
  imprimirPedidoBluetooth,
  type PrinterConfig,
} from "@/lib/thermal/printer";
import { PRINTER_CONFIG_EVENT, mensagemBluetooth } from "@/lib/thermal/services";
import {
  PAGAMENTO_STATUS_LABEL,
  metodoPagamentoLabel,
  pagamentoStatusCor,
} from "@/lib/payment-status";
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
  const config = useQuery(adminConfiguracoesQuery);
  const [filtro, setFiltro] = useState<Filtro>("andamento");
  const [busca, setBusca] = useState("");
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [impressora, setImpressora] = useState<PrinterConfig>(() => carregarConfigImpressora());

  useEffect(() => {
    const atualizar = () => setImpressora(carregarConfigImpressora());
    window.addEventListener(PRINTER_CONFIG_EVENT, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(PRINTER_CONFIG_EVENT, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const mudarPapel = (valor: "58" | "80") => {
    const novo = atualizarConfigImpressora({ width: Number(valor) === 58 ? 58 : 80 });
    setImpressora(novo);
    toast.success(`Papel ${novo.width} mm configurado.`);
  };

  const alternarImpressaoAutomatica = (ativo: boolean) => {
    if (ativo && !impressora.printer) {
      toast.error("Conecte uma impressora Bluetooth antes de ativar a impressão automática.");
      return;
    }
    const novo = atualizarConfigImpressora({ autoPrint: ativo });
    setImpressora(novo);
    toast.success(ativo ? "Impressão automática de novos pedidos ativada." : "Impressão automática desativada.");
  };

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminPedidos }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.adminPagamentos }),
      qc.invalidateQueries({ queryKey: chaves.adminFilaImpressao }),
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
      if (apenasPendentes && pedido.status_pagamento !== "pendente") return false;
      if (!termo) return true;
      return [String(pedido.numero), pedido.cliente_nome, pedido.cliente_telefone].join(" ").toLowerCase().includes(termo);
    });
  }, [data, filtro, busca, apenasPendentes]);

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
    if (
      status !== "cancelado" &&
      pedido.pagamento_provedor === "infinitepay" &&
      pedido.status_pagamento !== "pago"
    ) {
      toast.error("Aguarde a confirmação do pagamento online pela InfinitePay.");
      return;
    }
    try {
      await atualizarStatusPedido(pedido.id, status);
      toast.success(`Pedido #${pedido.numero}: ${STATUS_LABEL[status].toLowerCase()}.`);
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o pedido.");
    }
  };

  const marcarPago = async (pedido: Pedido) => {
    if (pedido.pagamento_provedor === "infinitepay") {
      toast.error("Pedidos online são confirmados automaticamente pela InfinitePay.");
      return;
    }
    try {
      await atualizarPagamentoPedido(pedido.id, pedido.status_pagamento === "pago" ? "pendente" : "pago");
      toast.success(pedido.status_pagamento === "pago" ? "Pagamento reaberto." : "Pagamento confirmado.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar o pagamento.");
    }
  };

  const verificarPagamento = async (pedido: Pedido) => {
    if (!pedido.tracking_token) {
      toast.error("Token do pedido indisponível para consultar a InfinitePay.");
      return;
    }
    try {
      const resposta = await sincronizarPagamentoOnline({
        pedidoId: pedido.id,
        trackingToken: pedido.tracking_token,
        forcar: true,
      });
      if (resposta.status === "aprovado") {
        toast.success(`Pedido #${pedido.numero}: pagamento confirmado pela InfinitePay.`);
      } else if (resposta.mensagem) {
        toast.info(resposta.mensagem);
      } else {
        toast.info(`Pedido #${pedido.numero}: pagamento ${PAGAMENTO_STATUS_LABEL[resposta.status].toLowerCase()}.`);
      }
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível consultar o pagamento na InfinitePay.");
    }
  };

  const excluir = async (pedido: Pedido) => {
    if (!window.confirm(`Excluir definitivamente o pedido #${pedido.numero}? Os itens e o histórico também serão removidos.`)) return;
    try {
      await excluirPedido(pedido.id);
      toast.success("Pedido excluído.");
      setSelecionadoId(null);
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir o pedido.");
    }
  };

  const reimprimir = async (pedido: Pedido) => {
    try {
      await enfileirarReimpressao(pedido.id);
      toast.success(`Pedido #${pedido.numero} enviado para a fila de impressão.`);
      await qc.invalidateQueries({ queryKey: chaves.adminFilaImpressao });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível enfileirar a reimpressão.");
    }
  };

  const imprimirNoBluetooth = async (pedido: Pedido) => {
    try {
      await imprimirPedidoBluetooth(montarPayloadImpressao(pedido, config.data?.configuracoes));
      toast.success(`Pedido #${pedido.numero} enviado para a impressora Bluetooth (${impressora.width} mm).`);
    } catch (erro) {
      toast.error(mensagemBluetooth(erro, "Não foi possível imprimir no Bluetooth."));
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Pedidos"
        descricao="Acompanhe a cozinha e atualize cada pedido. Pagamentos online são confirmados automaticamente pela InfinitePay; pedidos com pagamento manual podem ser confirmados no detalhe. A lista é atualizada a cada 15 segundos."
        acao={
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", isFetching ? "bg-accent" : "bg-success")} />
            {isFetching ? "Atualizando…" : "Atualizado"}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", impressora.printer ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
            <Bluetooth className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Impressão Bluetooth</p>
            <p className="text-[11px] text-muted-foreground">
              {impressora.printer
                ? `${impressora.printer.name} • ${impressora.width} mm • imprime novos pedidos com o painel aberto.`
                : "Nenhuma impressora conectada neste aparelho."}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Papel
            <select
              value={String(impressora.width)}
              onChange={(event) => mudarPapel(event.target.value === "58" ? "58" : "80")}
              className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs focus:border-primary focus:outline-none"
            >
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={impressora.autoPrint}
              onChange={alternarImpressaoAutomatica}
              label="Impressão automática de novos pedidos"
              disabled={!impressora.printer}
            />
            Automática
          </label>
          <Link to="/admin/impressao" className="text-xs font-medium text-primary underline underline-offset-4">
            {impressora.printer ? "Configurar" : "Conectar impressora"}
          </Link>
        </div>
      </div>

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
        <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">
          <Checkbox checked={apenasPendentes} onChange={setApenasPendentes} label="Só pagamento pendente" />
        </div>
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
            const pagamentoOnlinePendente =
              pedido.pagamento_provedor === "infinitepay" && pedido.status_pagamento !== "pago";
            const proximos = proximosStatus(pedido).filter(
              (status) => status !== "cancelado" && !pagamentoOnlinePendente,
            );
            const podeCancelar = !["entregue", "retirado", "cancelado"].includes(pedido.status);
            return (
              <article key={pedido.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">#{pedido.numero}</p>
                      <StatusPedidoBadge status={pedido.status} />
                      <StatusPagamentoBadge status={pedido.status_pagamento} />
                      {pedido.pagamento_provedor === "infinitepay" ? (
                        <Badge cor={pagamentoStatusCor(pedido.pagamento?.status ?? "pendente")}>
                          InfinitePay
                        </Badge>
                      ) : null}
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
                  {impressora.printer && !pagamentoOnlinePendente ? (
                    <Button size="sm" variant="outline" onClick={() => void imprimirNoBluetooth(pedido)}>
                      <Bluetooth className="h-3.5 w-3.5" /> Imprimir {impressora.width} mm
                    </Button>
                  ) : null}
                  {pedido.pagamento_provedor === "infinitepay" && pedido.status !== "cancelado" ? (
                    <Button size="sm" variant="outline" onClick={() => void verificarPagamento(pedido)}>
                      <RefreshCw className="h-3.5 w-3.5" /> Verificar pagamento
                    </Button>
                  ) : pedido.status_pagamento !== "pago" && pedido.status !== "cancelado" ? (
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
            aoVerificarPagamento={() => void verificarPagamento(selecionado)}
            aoExcluir={() => void excluir(selecionado)}
            aoReimprimir={() => void reimprimir(selecionado)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function DetalhePedido({
  pedido,
  aoMudarStatus,
  aoMarcarPago,
  aoVerificarPagamento,
  aoExcluir,
  aoReimprimir,
}: {
  pedido: Pedido;
  aoMudarStatus: (status: StatusPedido) => void;
  aoMarcarPago: () => void;
  aoVerificarPagamento: () => void;
  aoExcluir: () => void;
  aoReimprimir: () => void;
}) {
  const config = useQuery(adminConfiguracoesQuery);
  const [imprimindo, setImprimindo] = useState(false);

  const imprimirBluetooth = async () => {
    setImprimindo(true);
    try {
      await imprimirPedidoBluetooth(montarPayloadImpressao(pedido, config.data?.configuracoes));
      toast.success("Pedido enviado para a impressora Bluetooth.");
    } catch (falha) {
      toast.error(mensagemBluetooth(falha, "Não foi possível imprimir no Bluetooth."));
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/35 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPedidoBadge status={pedido.status} />
          <StatusPagamentoBadge status={pedido.status_pagamento} />
          {pedido.pagamento_provedor === "infinitepay" ? (
            <Badge cor={pagamentoStatusCor(pedido.pagamento?.status ?? "pendente")}>
              {pedido.pagamento ? PAGAMENTO_STATUS_LABEL[pedido.pagamento.status] : "InfinitePay"}
            </Badge>
          ) : null}
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
            <div className="mt-1 text-sm">
              <p>
                {[pedido.endereco, pedido.numero_endereco, pedido.complemento].filter(Boolean).join(", ")}
                <br />
                {[pedido.bairro, pedido.cidade, pedido.cep].filter(Boolean).join(" • ")}
                {pedido.referencia ? <><br />Ref.: {pedido.referencia}</> : null}
              </p>
              {pedido.latitude != null && pedido.longitude != null ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${pedido.latitude},${pedido.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline decoration-current/30 underline-offset-4 hover:decoration-current"
                >
                  <MapPin className="h-3.5 w-3.5" /> Abrir localização no mapa
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Cliente retira no estabelecimento.</p>
          )}
        </div>
      </div>

      {pedido.pagamento_provedor === "infinitepay" || pedido.pagamento ? (
        <div className="rounded-xl border border-border p-4 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Pagamento online</p>
          <p className="mt-1">
            {pedido.pagamento
              ? `${metodoPagamentoLabel(pedido.forma_pagamento, "infinitepay", pedido.pagamento_online_tipo)} • ${PAGAMENTO_STATUS_LABEL[pedido.pagamento.status]}`
              : "InfinitePay sem registro de pagamento online."}
          </p>
          {pedido.pagamento_provedor === "infinitepay" && pedido.status_pagamento !== "pago" ? (
            <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
              Aguardando a confirmação da InfinitePay. Iniciar preparo e imprimir são liberados após o pagamento.
            </p>
          ) : null}
          {pedido.pagamento?.ultimo_erro ? (
            <p className="mt-1 text-xs text-danger">{pedido.pagamento.ultimo_erro}</p>
          ) : null}
          {pedido.pagamento?.gateway_payment_id ? (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Transação InfinitePay: {pedido.pagamento.gateway_payment_id}
            </p>
          ) : null}
        </div>
      ) : null}

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
        {proximosStatus(pedido)
          .filter(
            (status) =>
              status !== "cancelado" &&
              !(pedido.pagamento_provedor === "infinitepay" && pedido.status_pagamento !== "pago"),
          )
          .map((status) => (
            <Button key={status} onClick={() => aoMudarStatus(status)}>
              <CheckCircle2 className="h-4 w-4" /> {ROTULO_ACAO[status]}
            </Button>
          ))}
        {pedido.pagamento_provedor === "infinitepay" && pedido.status !== "cancelado" ? (
          <Button variant="outline" onClick={aoVerificarPagamento}>
            <RefreshCw className="h-4 w-4" /> Verificar pagamento
          </Button>
        ) : pedido.status_pagamento !== "pago" && pedido.status !== "cancelado" ? (
          <Button variant="outline" onClick={aoMarcarPago}><CircleDollarSign className="h-4 w-4" /> Marcar pago</Button>
        ) : null}
        {!["entregue", "retirado", "cancelado"].includes(pedido.status) ? (
          <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => aoMudarStatus("cancelado")}>
            <XCircle className="h-4 w-4" /> Cancelar pedido
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => void imprimirBluetooth()}
          disabled={
            imprimindo ||
            (pedido.pagamento_provedor === "infinitepay" && pedido.status_pagamento !== "pago")
          }
        >
          <Bluetooth className="h-4 w-4" /> {imprimindo ? "Enviando…" : "Imprimir Bluetooth"}
        </Button>
        <Button variant="outline" onClick={aoReimprimir}>
          <Printer className="h-4 w-4" /> Imprimir novamente
        </Button>
        <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={aoExcluir}>
          <Trash2 className="h-4 w-4" /> Excluir pedido
        </Button>
      </div>
    </div>
  );
}

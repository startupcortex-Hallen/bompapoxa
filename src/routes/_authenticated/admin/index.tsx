import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Package,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  UtensilsCrossed,
} from "lucide-react";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { StatusPedidoBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { EstadoErro, Skeleton } from "@/components/ui/feedback";
import { adminDashboardQuery, layoutPublicoQuery } from "@/lib/queries";
import { dataHoraBR, moedaBRL } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  useTitulo("Visão geral");
  const { data, isLoading, error, refetch } = useQuery(adminDashboardQuery);
  const { data: layout } = useQuery(layoutPublicoQuery);

  if (isLoading) return <Carregando />;
  if (error || !data) return <EstadoErro mensagem={error instanceof Error ? error.message : "Não foi possível carregar os indicadores."} aoTentarNovamente={() => void refetch()} />;

  const config = layout?.configuracoes;
  const horariosConfigurados = (layout?.horarios ?? []).some((h) => !h.fechado && h.abre && h.fecha);
  const checklist = [
    { ok: data.totalProdutos > 0, rotulo: "Adicionar os primeiros produtos", to: "/admin/produtos" as const },
    { ok: horariosConfigurados, rotulo: "Configurar os horários de funcionamento", to: "/admin/configuracoes" as const },
    { ok: Boolean(config?.logo_url), rotulo: "Enviar a logo do estabelecimento", to: "/admin/configuracoes" as const },
    { ok: Boolean(config?.banner_url), rotulo: "Adicionar uma foto de capa", to: "/admin/configuracoes" as const },
    { ok: (config?.formas_pagamento.length ?? 0) > 0, rotulo: "Revisar as formas de pagamento", to: "/admin/configuracoes" as const },
  ];
  const concluidos = checklist.filter((item) => item.ok).length;
  const semProdutos = data.totalProdutos === 0;

  return (
    <div className="space-y-7">
      <AdminPageHeader
        titulo="Visão geral"
        descricao="Um panorama rápido da operação de hoje."
        acao={
          <>
            <Link to="/admin/pedidos">
              <Button variant="outline">
                <ReceiptText className="h-4 w-4" /> Ver pedidos
              </Button>
            </Link>
            <Link to="/admin/produtos">
              <Button>
                <Plus className="h-4 w-4" /> Novo produto
              </Button>
            </Link>
          </>
        }
      />

      {semProdutos ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-5">
          <div className="flex items-start gap-3">
            <UtensilsCrossed className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Seu cardápio ainda está vazio</p>
              <p className="text-sm text-muted-foreground">Cadastre categorias, produtos e adicionais para começar a receber pedidos.</p>
            </div>
          </div>
          <Link to="/admin/produtos">
            <Button size="sm">Cadastrar produto</Button>
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard rotulo="Pedidos hoje" valor={String(data.pedidosHoje)} detalhe="Pedidos não cancelados" icone={<ReceiptText className="h-4 w-4" />} destaque />
        <StatCard rotulo="Faturamento hoje" valor={moedaBRL(data.faturamentoHoje)} detalhe="Pedidos não cancelados" icone={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard rotulo="Em andamento" valor={String(data.emAndamento)} detalhe="Novos, em preparo ou prontos" icone={<Clock className="h-4 w-4" />} />
        <StatCard rotulo="Faturamento 30 dias" valor={moedaBRL(data.faturamento30Dias)} detalhe="Últimos 30 dias" icone={<CalendarClock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard rotulo="Produtos" valor={String(data.totalProdutos)} detalhe={`${data.produtosDisponiveis} disponíveis`} icone={<UtensilsCrossed className="h-4 w-4" />} />
        <StatCard rotulo="Indisponíveis" valor={String(data.produtosIndisponiveis)} detalhe="Esgotados ou ocultos" icone={<AlertCircle className="h-4 w-4" />} />
        <StatCard rotulo="Avaliações pendentes" valor={String(data.avaliacoesPendentes)} detalhe="Aguardando moderação" icone={<Star className="h-4 w-4" />} />
        <StatCard rotulo="Cupons ativos" valor={String(data.cuponsAtivos)} detalhe={`${data.totalCategorias} categorias`} icone={<TicketPercent className="h-4 w-4" />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-xl">Últimos pedidos</h2>
            <Link to="/admin/pedidos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.ultimosPedidos.length ? (
            <ul className="divide-y divide-border">
              {data.ultimosPedidos.map((pedido) => (
                <li key={pedido.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      #{pedido.numero}
                      <StatusPedidoBadge status={pedido.status} />
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {pedido.cliente_nome} • {pedido.modalidade === "delivery" ? "Entrega" : "Retirada"} • {dataHoraBR(pedido.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{moedaBRL(pedido.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido ainda. Quando chegarem, eles aparecem aqui.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Prepare a casa</h2>
            <span className="text-xs text-muted-foreground">{concluidos} de {checklist.length}</span>
          </div>
          <ul className="mt-3">
            {checklist.map((item) => (
              <li key={item.rotulo}>
                <Link to={item.to} className="group flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", item.ok ? "border-success bg-success text-white" : "border-border")}>
                    {item.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className={cn("flex-1 text-sm", item.ok && "text-muted-foreground line-through decoration-1")}>{item.rotulo}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Atalho to="/admin/categorias" rotulo="Categorias" icone={<Tags className="h-4 w-4" />} />
        <Atalho to="/admin/combos" rotulo="Combos" icone={<Package className="h-4 w-4" />} />
        <Atalho to="/admin/configuracoes" rotulo="Configurações" icone={<Settings className="h-4 w-4" />} />
        <Atalho to="/admin/qr" rotulo="QR do cardápio" icone={<ShoppingBag className="h-4 w-4" />} />
      </section>
    </div>
  );
}

function Atalho({ to, rotulo, icone }: { to: "/admin/categorias" | "/admin/combos" | "/admin/configuracoes" | "/admin/qr"; rotulo: string; icone: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary/50">
      {icone}
      <span>{rotulo}</span>
    </Link>
  );
}

function Carregando() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}


import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Info,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
import { Badge, EstadoErro, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form";
import { atualizarConfiguracaoPagamento } from "@/lib/api";
import { consultarStatusInfinitepay } from "@/lib/online-payments";
import {
  PAGAMENTO_STATUS_LABEL,
  STATUS_INTEGRACAO_LABEL,
  pagamentoStatusCor,
} from "@/lib/payment-status";
import {
  adminPagamentoConfigQuery,
  adminPagamentoEventosQuery,
  adminPagamentosQuery,
  adminPedidosQuery,
  chaves,
} from "@/lib/queries";
import { dataHoraBR, moedaBRL } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { StatusIntegracaoPagamento } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  component: PagamentosPage,
});

const CORES_STATUS: Record<StatusIntegracaoPagamento, "success" | "danger" | "accent" | "primary" | "neutral"> = {
  nao_configurado: "neutral",
  aguardando_credenciais: "accent",
  configurado: "primary",
  testes_aprovados: "success",
  producao_ativa: "success",
};

function PagamentosPage() {
  useTitulo("Pagamentos");
  const qc = useQueryClient();
  const config = useQuery(adminPagamentoConfigQuery);
  const pagamentos = useQuery(adminPagamentosQuery);
  const eventos = useQuery(adminPagamentoEventosQuery);
  const pedidos = useQuery(adminPedidosQuery);
  const [verificando, setVerificando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const status = useQuery({
    queryKey: ["admin", "infinitepay-status"],
    queryFn: () => consultarStatusInfinitepay(false),
    retry: false,
    staleTime: 30_000,
  });

  const dadosStatus = status.data;
  const pedidosPorId = new Map((pedidos.data ?? []).map((pedido) => [pedido.id, pedido]));

  const alternarIntegracao = async () => {
    if (!config.data) return;
    setSalvando(true);
    try {
      await atualizarConfiguracaoPagamento({ infinitepay_ativo: !config.data.infinitepay_ativo });
      await qc.invalidateQueries({ queryKey: chaves.adminPagamentoConfig });
      await qc.invalidateQueries({ queryKey: chaves.pagamentoPublico });
      await status.refetch();
      toast.success("Configuração de pagamento atualizada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar a configuração.");
    } finally {
      setSalvando(false);
    }
  };

  const verificarComunicacao = async () => {
    setVerificando(true);
    try {
      const resposta = await consultarStatusInfinitepay(true);
      qc.setQueryData(["admin", "infinitepay-status"], resposta);
      await qc.invalidateQueries({ queryKey: chaves.adminPagamentoConfig });
      if (resposta.comunicacao?.ok) {
        toast.success(resposta.comunicacao.mensagem);
      } else {
        toast.error(resposta.comunicacao?.mensagem ?? "Falha no teste de comunicação.");
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível testar a comunicação.");
    } finally {
      setVerificando(false);
    }
  };

  const copiar = async (texto: string, rotulo: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${rotulo} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${rotulo.toLowerCase()}.`);
    }
  };

  if (config.isError && pagamentos.isError) {
    return (
      <EstadoErro
        mensagem="A migration de pagamentos ainda não foi aplicada no Supabase. Execute a nova migration antes de usar esta tela."
        aoTentarNovamente={() => {
          void config.refetch();
          void pagamentos.refetch();
        }}
      />
    );
  }

  const statusConfig = dadosStatus?.status ?? "nao_configurado";
  const faltando = dadosStatus?.faltando ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Pagamentos"
        descricao="Checkout Integrado da InfinitePay: link hospedado, webhook e confirmação server-to-server."
        acao={
          <Button variant="outline" onClick={() => void status.refetch()} disabled={status.isFetching}>
            <RefreshCw className={cn("h-4 w-4", status.isFetching && "animate-spin")} /> Atualizar status
          </Button>
        }
      />

      <AdminSection
        titulo="Integração InfinitePay"
        descricao="A API Key fica nas Edge Functions do Supabase. Esta tela nunca exibe a API Key ou a InfiniteTag."
        acao={
          <Badge cor={CORES_STATUS[statusConfig]}>
            {status.isLoading ? "Consultando…" : STATUS_INTEGRACAO_LABEL[statusConfig]}
          </Badge>
        }
      >
        {status.isError ? (
          <div className="rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-danger">
              <AlertCircle className="h-4 w-4" /> Edge Functions de pagamento indisponíveis
            </p>
            <p className="mt-1 text-muted-foreground">
              Publique as funções <code>infinitepay-*</code> no Supabase e cadastre os segredos. Enquanto isso, a
              opção online fica oculta no checkout.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{status.error instanceof Error ? status.error.message : "Erro desconhecido."}</p>
          </div>
        ) : null}

        {status.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : dadosStatus ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador rotulo="Ambiente" valor="Produção (sem sandbox)" />
              <Indicador
                rotulo="InfiniteTag"
                valor={dadosStatus.handleConfigurado ? "Configurada" : "Ausente"}
                ok={dadosStatus.handleConfigurado}
              />
              <Indicador
                rotulo="API Key"
                valor={dadosStatus.apiKeyConfigurado ? "Configurada" : "Ausente"}
                ok={dadosStatus.apiKeyConfigurado}
              />
              <Indicador
                rotulo="Ativação"
                valor={dadosStatus.ativo ? "Ativa" : "Desativada"}
                ok={dadosStatus.ativo}
              />
            </div>

            {faltando.length ? (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <KeyRound className="h-4 w-4" /> Faltam credenciais
                </p>
                <p className="mt-1 text-muted-foreground">
                  Cadastre no Supabase: <strong>{faltando.join(", ")}</strong>. Veja{" "}
                  <span className="font-mono text-xs">docs/infinitepay.md</span>.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Webhook className="h-4 w-4" /> URL do webhook
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => void copiar(dadosStatus.webhookUrl, "Webhook")}>
                    <ClipboardCopy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
                <p className="mt-2 break-all rounded-lg bg-secondary/40 px-3 py-2 font-mono text-[11px]">
                  {dadosStatus.webhookUrl || "Configure SUPABASE_URL ou INFINITEPAY_WEBHOOK_URL."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  A URL é enviada em cada link criado. A InfinitePay não permite editar o webhook de um link antigo;
                  links novos usam esta URL. Não há assinatura HMAC: cada notificação é confirmada em{" "}
                  <code>/payment_check</code> antes de aprovar o pedido.
                </p>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" /> Último teste
                </p>
                <p className="mt-2 text-sm">
                  {dadosStatus.ultimoTesteOk ? "API acessível" : "Ainda não aprovado"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dadosStatus.ultimoTesteEm ? dataHoraBR(dadosStatus.ultimoTesteEm) : "Nenhum teste registrado."}
                  {dadosStatus.ultimoTesteAmbiente ? ` • ${dadosStatus.ultimoTesteAmbiente}` : ""}
                </p>
                {dadosStatus.ultimoTesteMensagem ? (
                  <p className="mt-2 text-xs text-muted-foreground">{dadosStatus.ultimoTesteMensagem}</p>
                ) : null}
                <Button
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  carregando={verificando}
                  onClick={() => void verificarComunicacao()}
                  disabled={!dadosStatus.configurado}
                >
                  <LoaderCircle className={cn("h-3.5 w-3.5", !verificando && "hidden")} />
                  <RefreshCw className={cn("h-3.5 w-3.5", verificando && "hidden")} /> Verificar comunicação
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">Ativação no painel</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ative somente depois de cadastrar a InfiniteTag/API Key e aprovar o teste de comunicação. O checkout
                oferece PIX e cartão de crédito na mesma página hospedada.
              </p>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(config.data?.infinitepay_ativo)}
                    onChange={() => void alternarIntegracao()}
                    label="Integração ativa"
                    disabled={salvando || !dadosStatus.configurado}
                  />
                  Integração ativa
                </label>
              </div>
              {!dadosStatus.configurado ? (
                <p className="mt-3 text-xs text-accent">
                  A ativação fica bloqueada enquanto as credenciais obrigatórias não estiverem cadastradas.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminSection>

      <AdminSection
        titulo="Últimos pagamentos online"
        descricao="Atualização a cada 30 segundos. O status é alterado somente pelo backend após consulta oficial à InfinitePay."
      >
        {pagamentos.isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : pagamentos.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os pagamentos.</p>
        ) : pagamentos.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Pedido</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">InfinitePay</th>
                  <th className="py-2">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagamentos.data.slice(0, 30).map((pagamento) => {
                  const pedido = pedidosPorId.get(pagamento.pedido_id);
                  const tipo =
                    pagamento.tipo === "pix"
                      ? "PIX online"
                      : pagamento.tipo === "cartao"
                        ? "Cartão online"
                        : "Checkout online";
                  return (
                    <tr key={pagamento.id}>
                      <td className="py-2.5 pr-3 font-medium">#{pedido?.numero ?? "—"}</td>
                      <td className="py-2.5 pr-3">{tipo}</td>
                      <td className="py-2.5 pr-3">
                        <Badge cor={pagamentoStatusCor(pagamento.status)}>{PAGAMENTO_STATUS_LABEL[pagamento.status]}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">{moedaBRL(pagamento.valor)}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                        {pagamento.gateway_payment_id ?? pagamento.gateway_checkout_id ?? pagamento.gateway_order_id ?? "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">{dataHoraBR(pagamento.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum pagamento online registrado.</p>
        )}
      </AdminSection>

      <AdminSection titulo="Eventos e erros recentes" descricao="Histórico técnico sem dados de cartão ou segredos.">
        {eventos.isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : eventos.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os eventos.</p>
        ) : eventos.data?.length ? (
          <ul className="divide-y divide-border text-sm">
            {eventos.data.slice(0, 25).map((evento) => (
              <li key={evento.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {evento.evento}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {evento.origem} • pedido {evento.pedido_id ? evento.pedido_id.slice(0, 8) : "—"}
                    </span>
                  </p>
                  {Object.keys(evento.detalhe).length ? (
                    <p className="mt-1 break-all text-[11px] text-muted-foreground">{JSON.stringify(evento.detalhe)}</p>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">{dataHoraBR(evento.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        )}
      </AdminSection>

      <AdminSection titulo="Como ativar" descricao="Passo a passo completo em docs/infinitepay.md.">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>No app InfinitePay, habilite o Checkout Integrado em Vendas &gt; Checkout &gt; Configurações.</li>
          <li>Crie uma API Key e copie a InfiniteTag (sem o símbolo $).</li>
          <li>Cadastre `INFINITEPAY_HANDLE` e `INFINITEPAY_API_KEY` no Supabase.</li>
          <li>Publique as Edge Functions `infinitepay-create-payment`, `infinitepay-sync-payment`, `infinitepay-webhook` e `infinitepay-admin-status`.</li>
          <li>Clique em Verificar comunicação e ative a integração no painel.</li>
          <li>Faça uma compra real de valor baixo, confirme o webhook e estorne pelo app se necessário.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="https://www.infinitepay.io/checkout-documentacao" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Documentação do Checkout
            </Button>
          </a>
          <a href="https://app.infinitepay.io/external-checkout#configuracoes" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Info className="h-3.5 w-3.5" /> Configurar Checkout Integrado
            </Button>
          </a>
        </div>
      </AdminSection>
    </div>
  );
}

function Indicador({ rotulo, valor, ok }: { rotulo: string; valor: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{rotulo}</p>
      <p className={cn("mt-1 flex items-center gap-1.5 text-sm font-medium", ok === true ? "text-success" : ok === false ? "text-accent" : "")}>
        {ok === true ? <CheckCircle2 className="h-3.5 w-3.5" /> : ok === false ? <AlertCircle className="h-3.5 w-3.5" /> : null}
        {valor}
      </p>
    </div>
  );
}

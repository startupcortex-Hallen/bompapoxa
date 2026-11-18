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
import { consultarStatusMercadoPago } from "@/lib/online-payments";
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
  configurado_sandbox: "primary",
  configurado_producao: "primary",
  testes_aprovados: "success",
  pronto_para_producao: "success",
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
  const [salvando, setSalvando] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["admin", "mercadopago-status"],
    queryFn: () => consultarStatusMercadoPago(false),
    retry: false,
    staleTime: 30_000,
  });

  const dadosStatus = status.data;
  const pedidosPorId = new Map((pedidos.data ?? []).map((pedido) => [pedido.id, pedido]));

  const alternarConfig = async (campo: "mercadopago_ativo" | "pix_online_ativo" | "cartao_online_ativo") => {
    if (!config.data) return;
    setSalvando(campo);
    try {
      await atualizarConfiguracaoPagamento({ [campo]: !config.data[campo] });
      await qc.invalidateQueries({ queryKey: chaves.adminPagamentoConfig });
      await qc.invalidateQueries({ queryKey: chaves.pagamentoPublico });
      await status.refetch();
      toast.success("Configuração de pagamento atualizada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar a configuração.");
    } finally {
      setSalvando(null);
    }
  };

  const verificarComunicacao = async () => {
    setVerificando(true);
    try {
      const resposta = await consultarStatusMercadoPago(true);
      qc.setQueryData(["admin", "mercadopago-status"], resposta);
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
        descricao="Integração oficial Mercado Pago, credenciais no servidor, webhook e acompanhamento dos pagamentos online."
        acao={
          <Button variant="outline" onClick={() => void status.refetch()} disabled={status.isFetching}>
            <RefreshCw className={cn("h-4 w-4", status.isFetching && "animate-spin")} /> Atualizar status
          </Button>
        }
      />

      <AdminSection
        titulo="Integração Mercado Pago"
        descricao="Os segredos ficam nas Edge Functions do Supabase. Esta tela nunca exibe Access Token, Public Key ou Webhook Secret."
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
              Publique as funções <code>mercadopago-*</code> no Supabase e cadastre os segredos. Enquanto isso, as
              opções online ficam ocultas no checkout.
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
              <Indicador rotulo="Ambiente" valor={dadosStatus.ambiente === "producao" ? "Produção" : "Sandbox"} />
              <Indicador
                rotulo="Access Token"
                valor={dadosStatus.accessTokenConfigurado ? "Configurado" : "Ausente"}
                ok={dadosStatus.accessTokenConfigurado}
              />
              <Indicador
                rotulo="Public Key"
                valor={dadosStatus.publicKeyConfigurado ? "Configurada" : "Ausente"}
                ok={dadosStatus.publicKeyConfigurado}
              />
              <Indicador
                rotulo="Webhook Secret"
                valor={dadosStatus.webhookSecretConfigurado ? "Configurado" : "Ausente"}
                ok={dadosStatus.webhookSecretConfigurado}
              />
            </div>

            {faltando.length ? (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <KeyRound className="h-4 w-4" /> Faltam credenciais
                </p>
                <p className="mt-1 text-muted-foreground">
                  Cadastre no Supabase: <strong>{faltando.join(", ")}</strong>. Veja{" "}
                  <span className="font-mono text-xs">docs/mercadopago.md</span>.
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
                  {dadosStatus.webhookUrl}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Cadastre esta URL no painel do Mercado Pago em Webhooks e habilite os eventos <strong>Order</strong> e{" "}
                  <strong>Pagamentos</strong>, separadamente em Teste e Produção.
                </p>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" /> Último teste
                </p>
                <p className="mt-2 text-sm">
                  {dadosStatus.ultimoTesteOk ? "Comunicação autenticada" : "Ainda não aprovado"}
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
                  disabled={!dadosStatus.accessTokenConfigurado}
                >
                  <LoaderCircle className={cn("h-3.5 w-3.5", !verificando && "hidden")} />
                  <RefreshCw className={cn("h-3.5 w-3.5", verificando && "hidden")} /> Verificar comunicação
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">Ativação no painel</p>
              <p className="mt-1 text-xs text-muted-foreground">
                As opções abaixo controlam o que aparece no checkout. Ative somente depois de configurar os segredos e
                aprovar o teste de comunicação.
              </p>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(config.data?.mercadopago_ativo)}
                    onChange={() => void alternarConfig("mercadopago_ativo")}
                    label="Integração ativa"
                    disabled={salvando !== null || !dadosStatus.configurado}
                  />
                  Integração ativa
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(config.data?.pix_online_ativo)}
                    onChange={() => void alternarConfig("pix_online_ativo")}
                    label="PIX online"
                    disabled={salvando !== null || !config.data?.mercadopago_ativo}
                  />
                  PIX online
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(config.data?.cartao_online_ativo)}
                    onChange={() => void alternarConfig("cartao_online_ativo")}
                    label="Cartão online"
                    disabled={salvando !== null || !config.data?.mercadopago_ativo}
                  />
                  Cartão online
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
        descricao="Atualização a cada 30 segundos. O status é alterado somente pelo backend após consulta oficial ao Mercado Pago."
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
                  <th className="py-2 pr-3">Mercado Pago</th>
                  <th className="py-2">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagamentos.data.slice(0, 30).map((pagamento) => {
                  const pedido = pedidosPorId.get(pagamento.pedido_id);
                  return (
                    <tr key={pagamento.id}>
                      <td className="py-2.5 pr-3 font-medium">#{pedido?.numero ?? "—"}</td>
                      <td className="py-2.5 pr-3">{pagamento.tipo === "pix" ? "PIX online" : "Cartão online"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge cor={pagamentoStatusCor(pagamento.status)}>{PAGAMENTO_STATUS_LABEL[pagamento.status]}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">{moedaBRL(pagamento.valor)}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-muted-foreground">
                        {pagamento.mp_payment_id ?? pagamento.mp_order_id ?? pagamento.mp_preference_id ?? "—"}
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

      <AdminSection titulo="Como ativar" descricao="Passo a passo completo em docs/mercadopago.md.">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Crie a aplicação no painel de integrações do Mercado Pago e copie as credenciais de Teste.</li>
          <li>Cadastre os segredos no Supabase com `supabase secrets set --env-file supabase/.env`.</li>
          <li>Publique as Edge Functions `mercadopago-create-payment`, `mercadopago-sync-payment`, `mercadopago-webhook` e `mercadopago-admin-status`.</li>
          <li>Cadastre a URL do webhook no Mercado Pago e habilite os eventos Order e Pagamentos.</li>
          <li>Clique em Verificar comunicação e depois ative PIX online e/ou Cartão online.</li>
          <li>Faça uma compra teste no Sandbox. O status só muda com confirmação real da API do Mercado Pago.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Painel Mercado Pago
            </Button>
          </a>
          <a href="https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Info className="h-3.5 w-3.5" /> Documentação PIX
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

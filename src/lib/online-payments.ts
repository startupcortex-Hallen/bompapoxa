import { supabase } from "@/integrations/supabase/client";
import { mapPagamento } from "./mappers";
import type {
  Pagamento,
  ResultadoPagamentoOnline,
  StatusIntegracaoInfinitepay,
} from "./types";

type RespostaEdge = {
  error?: string;
  ok?: boolean;
  tipo?: Pagamento["tipo"];
  status?: string;
  checkoutUrl?: string | null;
  pagamento?: Record<string, unknown> | null;
  jaPago?: boolean;
  reutilizado?: boolean;
  cache?: boolean;
  mensagem?: string;
};

function sinalComTimeout(ms: number): AbortSignal {
  const nativo = (AbortSignal as unknown as { timeout?: (milissegundos: number) => AbortSignal }).timeout;
  if (typeof nativo === "function") return nativo.call(AbortSignal, ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function baseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new Error("Supabase URL não configurada.");
  return url.replace(/\/+$/, "");
}

function anonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!key) throw new Error("Supabase anon key não configurada.");
  return key;
}

async function chamarEdge<T extends RespostaEdge>(
  funcao: string,
  corpo: Record<string, unknown>,
  admin = false,
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: anonKey(),
    "Content-Type": "application/json",
  };

  if (admin) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Sessão administrativa expirada.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  } else {
    headers.Authorization = `Bearer ${anonKey()}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${baseUrl()}/functions/v1/${funcao}`, {
      method: "POST",
      headers,
      body: JSON.stringify(corpo),
      signal: sinalComTimeout(30000),
    });
  } catch {
    throw new Error("Não foi possível falar com o servidor de pagamentos. Verifique a conexão.");
  }

  let dados: T | null = null;
  try {
    dados = (await resposta.json()) as T;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem = dados?.error || "Não foi possível concluir a operação de pagamento.";
    if (resposta.status === 404) {
      throw new Error("A integração de pagamentos online ainda não foi publicada no Supabase.");
    }
    throw new Error(mensagem);
  }
  if (!dados) throw new Error("Resposta inválida do servidor de pagamentos.");
  return dados;
}

function normalizarPagamento(
  valor: Record<string, unknown> | null | undefined,
  pedidoId: string,
): Pagamento | null {
  if (!valor) return null;
  return mapPagamento({ ...valor, pedido_id: valor.pedido_id ?? pedidoId });
}

export async function iniciarPagamentoOnline({
  pedidoId,
  trackingToken,
}: {
  pedidoId: string;
  trackingToken: string;
}): Promise<ResultadoPagamentoOnline> {
  const dados = await chamarEdge("infinitepay-create-payment", { pedidoId, trackingToken });
  return {
    ok: dados.ok !== false,
    jaPago: dados.jaPago,
    reutilizado: dados.reutilizado,
    tipo: dados.tipo ?? "online",
    status: (dados.pagamento?.status as ResultadoPagamentoOnline["status"]) ?? "pendente",
    checkoutUrl: dados.checkoutUrl ?? null,
    pagamento: normalizarPagamento(dados.pagamento, pedidoId),
    mensagem: dados.mensagem,
  };
}

export async function sincronizarPagamentoOnline({
  pedidoId,
  trackingToken,
  forcar = false,
  transactionNsu,
  slug,
  captureMethod,
  receiptUrl,
}: {
  pedidoId: string;
  trackingToken: string;
  forcar?: boolean;
  transactionNsu?: string | null;
  slug?: string | null;
  captureMethod?: string | null;
  receiptUrl?: string | null;
}): Promise<ResultadoPagamentoOnline> {
  const dados = await chamarEdge("infinitepay-sync-payment", {
    pedidoId,
    trackingToken,
    forcar,
    transactionNsu,
    slug,
    captureMethod,
    receiptUrl,
  });
  return {
    ok: dados.ok !== false,
    tipo: dados.tipo ?? "online",
    status: (dados.pagamento?.status as ResultadoPagamentoOnline["status"]) ?? "pendente",
    checkoutUrl: dados.checkoutUrl ?? null,
    pagamento: normalizarPagamento(dados.pagamento, pedidoId),
    cache: dados.cache,
    mensagem: dados.mensagem,
  };
}

export async function consultarStatusInfinitepay(check = false): Promise<StatusIntegracaoInfinitepay> {
  return chamarEdge<StatusIntegracaoInfinitepay & RespostaEdge>("infinitepay-admin-status", { check }, true);
}

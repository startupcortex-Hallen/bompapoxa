import { safeErrorMessage } from "./infinitepay-core.mjs";

const API_BASE = "https://api.checkout.infinitepay.io";
const DEFAULT_APP_URL = "https://startupcortex-hallen.github.io/bompapoxa";

export class InfinitepayError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "InfinitepayError";
    this.status = status;
    this.details = details;
  }
}

function env(name, fallback = "") {
  try {
    return Deno.env.get(name) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getInfinitepayConfig() {
  const appUrl = (env("APP_PUBLIC_URL", DEFAULT_APP_URL) || DEFAULT_APP_URL).replace(/\/+$/, "");
  const supabaseUrl = env("SUPABASE_URL", "").replace(/\/+$/, "");
  return {
    handle: env("INFINITEPAY_HANDLE").trim(),
    apiKey: env("INFINITEPAY_API_KEY").trim(),
    appUrl,
    webhookUrl:
      env("INFINITEPAY_WEBHOOK_URL") ||
      (supabaseUrl ? `${supabaseUrl}/functions/v1/infinitepay-webhook` : ""),
  };
}

export function missingInfinitepaySecrets(config = getInfinitepayConfig()) {
  const faltando = [];
  if (!config.handle) faltando.push("INFINITEPAY_HANDLE");
  if (!config.apiKey) faltando.push("INFINITEPAY_API_KEY");
  return faltando;
}

export function buildReturnUrl({ appUrl, pedidoId, token }) {
  const base = `${String(appUrl).replace(/\/+$/, "")}/pedido?id=${encodeURIComponent(pedidoId)}&token=${encodeURIComponent(token)}`;
  return base;
}

async function request(config, path, { method = "POST", body, timeoutMs = 20000 } = {}) {
  if (!config.handle && !config.apiKey) {
    throw new InfinitepayError("Credenciais da InfinitePay não configuradas.", 503);
  }
  const headers = { Accept: "application/json" };
  if (config.apiKey) headers["X-Api-Key"] = config.apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let resposta;
  try {
    resposta = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (erro) {
    throw new InfinitepayError(
      `Falha de comunicação com a InfinitePay: ${safeErrorMessage(erro, "tempo esgotado ou rede indisponível")}`,
      0,
    );
  }

  const texto = await resposta.text();
  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = { mensagem_bruta: texto.slice(0, 300) };
    }
  }

  if (!resposta.ok) {
    const detalhe =
      (dados && (dados.message || dados.error || dados.mensagem_bruta)) ||
      `HTTP ${resposta.status}`;
    throw new InfinitepayError(
      safeErrorMessage(detalhe, `InfinitePay respondeu HTTP ${resposta.status}.`),
      resposta.status,
      dados,
    );
  }

  return dados;
}

export function createPaymentLink(config, body) {
  const payload = { ...body };
  if (config.handle) payload.handle = config.handle;
  return request(config, "/links", { body: payload });
}

export function checkPayment(config, { orderNsu, transactionNsu, slug }) {
  return request(config, "/payment_check", {
    body: {
      ...(config.handle ? { handle: config.handle } : {}),
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug,
    },
  });
}

export async function pingApi(timeoutMs = 8000) {
  let resposta;
  try {
    resposta = await fetch(`${API_BASE}/`, {
      method: "GET",
      headers: { Accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (erro) {
    throw new InfinitepayError(
      `Falha de comunicação com a InfinitePay: ${safeErrorMessage(erro, "tempo esgotado ou rede indisponível")}`,
      0,
    );
  }
  if (!resposta.ok) {
    throw new InfinitepayError(`InfinitePay respondeu HTTP ${resposta.status}.`, resposta.status);
  }
  return true;
}

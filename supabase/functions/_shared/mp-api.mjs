import { safeErrorMessage } from "./mp-core.mjs";

const API_BASE = "https://api.mercadopago.com";
const DEFAULT_APP_URL = "https://startupcortex-hallen.github.io/bompapoxa";

export class MercadoPagoError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "MercadoPagoError";
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

export function getMpEnvironment() {
  const bruto = env("MERCADOPAGO_ENVIRONMENT", "sandbox").toLowerCase();
  return bruto === "producao" || bruto === "production" ? "producao" : "sandbox";
}

export function getMpConfig() {
  const ambiente = getMpEnvironment();
  const sufixo = ambiente === "producao" ? "PRODUCTION" : "SANDBOX";
  const escolher = (base) => env(`${base}_${sufixo}`) || env(base);
  return {
    ambiente,
    accessToken: escolher("MERCADOPAGO_ACCESS_TOKEN"),
    publicKey: escolher("MERCADOPAGO_PUBLIC_KEY"),
    webhookSecret: escolher("MERCADOPAGO_WEBHOOK_SECRET"),
    appUrl: (env("APP_PUBLIC_URL", DEFAULT_APP_URL) || DEFAULT_APP_URL).replace(/\/+$/, ""),
    webhookUrl:
      env("MERCADOPAGO_WEBHOOK_URL") ||
      `${env("SUPABASE_URL", "").replace(/\/+$/, "")}/functions/v1/mercadopago-webhook`,
  };
}

export function missingMpSecrets(config = getMpConfig()) {
  const faltando = [];
  if (!config.accessToken) faltando.push("MERCADOPAGO_ACCESS_TOKEN");
  if (!config.publicKey) faltando.push("MERCADOPAGO_PUBLIC_KEY");
  if (!config.webhookSecret) faltando.push("MERCADOPAGO_WEBHOOK_SECRET");
  return faltando;
}

export function buildReturnUrls({ appUrl, pedidoId, token }) {
  const base = `${String(appUrl).replace(/\/+$/, "")}/pedido?id=${encodeURIComponent(pedidoId)}&token=${encodeURIComponent(token)}`;
  return { success: base, failure: base, pending: base };
}

async function mpRequest(config, path, { method = "GET", body, idempotencyKey, timeoutMs = 25000 } = {}) {
  if (!config.accessToken) {
    throw new MercadoPagoError("Access Token do Mercado Pago não configurado.", 503);
  }
  const headers = {
    Authorization: `Bearer ${config.accessToken}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  let resposta;
  try {
    resposta = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (erro) {
    throw new MercadoPagoError(
      `Falha de comunicação com o Mercado Pago: ${safeErrorMessage(erro, "tempo esgotado ou rede indisponível")}`,
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
    throw new MercadoPagoError(
      safeErrorMessage(detalhe, `Mercado Pago respondeu HTTP ${resposta.status}.`),
      resposta.status,
      dados,
    );
  }

  return dados;
}

export function createPixOrder(config, body, idempotencyKey) {
  return mpRequest(config, "/v1/orders", { method: "POST", body, idempotencyKey });
}

export function createPreference(config, body, idempotencyKey) {
  return mpRequest(config, "/checkout/preferences", { method: "POST", body, idempotencyKey });
}

export function getOrder(config, orderId) {
  return mpRequest(config, `/v1/orders/${encodeURIComponent(orderId)}`);
}

export function getPayment(config, paymentId) {
  return mpRequest(config, `/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function getMe(config) {
  return mpRequest(config, "/users/me");
}

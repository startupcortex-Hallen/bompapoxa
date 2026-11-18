const STATUS_MAP = {
  approved: "aprovado",
  processed: "aprovado",
  accredited: "aprovado",
  rejected: "recusado",
  failed: "recusado",
  cancelled: "cancelado",
  canceled: "cancelado",
  expired: "expirado",
  refunded: "estornado",
  charged_back: "estornado",
  in_process: "em_processamento",
  processing: "em_processamento",
  pending: "pendente",
  action_required: "pendente",
  authorized: "pendente",
  waiting_transfer: "pendente",
};

const TERMINAL = new Set(["aprovado", "recusado", "cancelado", "expirado", "estornado"]);

export function normalizeMpStatus(status, detail) {
  const chave = String(status ?? detail ?? "").toLowerCase();
  return STATUS_MAP[chave] ?? (TERMINAL.has(chave) ? chave : "pendente");
}

export function isPaidStatus(status) {
  return normalizeMpStatus(status) === "aprovado";
}

export function cents(value) {
  const numero = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

export function amountsMatch(expected, received) {
  return cents(expected) === cents(received);
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeOrderResource(order) {
  const payment = order?.transactions?.payments?.[0] ?? {};
  const paymentMethod = payment.payment_method ?? {};
  const orderStatus = String(order?.status ?? "").toLowerCase();
  const paymentStatus = String(payment.status ?? "").toLowerCase();
  const statusBase =
    orderStatus === "processed" && (paymentStatus === "" || paymentStatus === "processed" || paymentStatus === "approved")
      ? "approved"
      : orderStatus === "action_required" || orderStatus === "processing"
        ? "pending"
        : orderStatus === "failed"
          ? "failed"
          : orderStatus || paymentStatus;
  return {
    resource: "order",
    resourceId: order?.id ? String(order.id) : null,
    externalReference: order?.external_reference ? String(order.external_reference) : null,
    amount: order?.total_amount ?? payment.amount ?? null,
    paidAmount: order?.total_paid_amount ?? payment.paid_amount ?? null,
    status: normalizeMpStatus(statusBase, payment.status_detail ?? order?.status_detail),
    statusMp: String(payment.status_detail ?? order?.status_detail ?? orderStatus ?? paymentStatus),
    tipo: "pix",
    metodo: String(paymentMethod.id ?? "pix"),
    mpOrderId: order?.id ? String(order.id) : null,
    mpPaymentId: payment?.id ? String(payment.id) : null,
    qrCode: paymentMethod.qr_code ?? null,
    qrCodeBase64: paymentMethod.qr_code_base64 ?? null,
    ticketUrl: paymentMethod.ticket_url ?? null,
    initPoint: null,
    sandboxInitPoint: null,
  };
}

export function normalizePaymentResource(payment) {
  const metodo = String(payment?.payment_method_id ?? payment?.payment_type_id ?? "").toLowerCase();
  const tipo = metodo.includes("pix") || metodo === "bank_transfer" ? "pix" : "cartao";
  return {
    resource: "payment",
    resourceId: payment?.id ? String(payment.id) : null,
    externalReference: payment?.external_reference ? String(payment.external_reference) : null,
    amount: payment?.transaction_amount ?? null,
    paidAmount: payment?.transaction_amount ?? null,
    status: normalizeMpStatus(payment?.status, payment?.status_detail),
    statusMp: String(payment?.status_detail ?? payment?.status ?? ""),
    tipo,
    metodo,
    mpOrderId: null,
    mpPaymentId: payment?.id ? String(payment.id) : null,
    qrCode: null,
    qrCodeBase64: null,
    ticketUrl: null,
    initPoint: null,
    sandboxInitPoint: null,
  };
}

export function extractWebhookEvent({ query = {}, body = {} } = {}) {
  const topic = String(query.topic ?? query.type ?? body.type ?? body.topic ?? "").toLowerCase();
  const dataId = String(
    query["data.id"] ?? query.data_id ?? body?.data?.id ?? body?.resource ?? "",
  );
  const notificationId = body?.id ? String(body.id) : null;
  const action = body?.action ? String(body.action) : "";
  const dateCreated = body?.date_created ? String(body.date_created) : "";
  const statusKey = body?.data?.status
    ? `${String(body.data.status)}:${String(body.data.status_detail ?? "")}`
    : "";
  const eventKey = [
    topic || "desconhecido",
    dataId || notificationId || "",
    action,
    notificationId ?? dateCreated ?? statusKey,
  ]
    .filter(Boolean)
    .join("|");
  return {
    topic,
    dataId,
    notificationId,
    action,
    eventKey,
    signature: null,
    raw: Boolean(dataId && (topic === "order" || topic === "payment")),
  };
}

function hexToBytes(hex) {
  const limpo = String(hex ?? "").trim();
  if (!/^[0-9a-f]+$/i.test(limpo) || limpo.length % 2 !== 0) return null;
  const bytes = new Uint8Array(limpo.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(limpo.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function parseSignature(value) {
  const partes = String(value ?? "").split(",").map((parte) => parte.trim());
  let ts = "";
  let v1 = "";
  for (const parte of partes) {
    const separador = parte.indexOf("=");
    if (separador < 0) continue;
    const chave = parte.slice(0, separador).trim();
    const valor = parte.slice(separador + 1).trim();
    if (chave === "ts") ts = valor;
    if (chave === "v1") v1 = valor;
  }
  return { ts, v1 };
}

export async function validateWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
}) {
  if (!xSignature || !xRequestId || !dataId || !secret) return false;
  const { ts, v1 } = parseSignature(xSignature);
  const assinatura = hexToBytes(v1);
  if (!ts || !assinatura) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return globalThis.crypto.subtle.verify("HMAC", key, assinatura, encoder.encode(manifest));
}

export function buildPixOrderBody({ order, payerEmail, expirationTime = "PT30M" }) {
  if (!payerEmail || !String(payerEmail).includes("@")) {
    throw new Error("Informe um e-mail válido para pagar com PIX online.");
  }
  const total = Number(order.total).toFixed(2);
  return {
    type: "online",
    total_amount: total,
    external_reference: `bompapoxa:${order.id}`,
    processing_mode: "automatic",
    transactions: {
      payments: [
        {
          amount: total,
          payment_method: { id: "pix", type: "bank_transfer" },
          expiration_time: expirationTime,
        },
      ],
    },
    payer: { email: String(payerEmail) },
  };
}

export function buildPreferenceBody({ order, payerEmail, backUrls, notificationUrl, statementDescriptor = "BOMPAPOXA" }) {
  const body = {
    items: [
      {
        id: `pedido-${order.id}`,
        title: `Pedido #${order.numero} - BOM PA POXA`,
        description: order.modalidade === "delivery" ? "Pedido para entrega" : "Pedido para retirada",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(order.total),
      },
    ],
    external_reference: `bompapoxa:${order.id}`,
    back_urls: backUrls,
    auto_return: "approved",
    notification_url: notificationUrl,
    statement_descriptor: statementDescriptor,
    metadata: { pedido_id: order.id, numero: order.numero },
  };
  if (payerEmail && String(payerEmail).includes("@")) {
    body.payer = { email: String(payerEmail) };
  }
  return body;
}

export function safeErrorMessage(error, fallback = "Não foi possível concluir a operação com o Mercado Pago.") {
  const bruto =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "";
  const limpo = bruto
    .replace(/APP_USR-[A-Za-z0-9-]+/g, "APP_USR-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/\s+/g, " ")
    .trim();
  return (limpo || fallback).slice(0, 500);
}

export function statusIsFinal(status) {
  return TERMINAL.has(normalizeMpStatus(status));
}

export function statusLabel(status) {
  return {
    pendente: "Aguardando pagamento",
    em_processamento: "Pagamento em processamento",
    aprovado: "Pagamento aprovado",
    recusado: "Pagamento recusado",
    cancelado: "Pagamento cancelado",
    expirado: "Pagamento expirado",
    estornado: "Pagamento estornado",
    erro: "Erro na comunicação",
  }[normalizeMpStatus(status)] ?? "Aguardando pagamento";
}

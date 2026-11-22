const EVENT_STATUS = {
  paid: "aprovado",
  settled: "aprovado",
  approved: "aprovado",
  canceled: "cancelado",
  cancelled: "cancelado",
  refunded: "estornado",
  refund: "estornado",
  payment_failed: "recusado",
  failed: "recusado",
  created: "pendente",
  pending: "pendente",
};

const TERMINAL = new Set(["aprovado", "recusado", "cancelado", "expirado", "estornado"]);

export function normalizeEventName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^payment[._-]/, "")
    .replace(/^checkout[._-]/, "")
    .replace(/[.\s]+/g, "_");
}

export function statusFromEvent(value) {
  return EVENT_STATUS[normalizeEventName(value)] ?? null;
}

export function normalizePaymentStatus({ check, event } = {}) {
  const statusEvento = statusFromEvent(event);
  if (statusEvento && statusEvento !== "pendente") return statusEvento;
  if (check?.paid === true && check?.success !== false) return "aprovado";
  if (check?.success === false) return "erro";
  return "pendente";
}

export function captureMethodToTipo(method) {
  const valor = String(method ?? "").toLowerCase();
  if (valor === "pix") return "pix";
  if (valor === "credit_card" || valor === "credit") return "cartao";
  return "online";
}

export function toCents(value) {
  const numero = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

export function amountsMatchCents(expectedTotal, receivedCents) {
  return toCents(expectedTotal) === Number(receivedCents);
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function phoneE164Br(value) {
  const digitos = onlyDigits(value);
  if (!digitos) return null;
  if (digitos.startsWith("55")) return `+${digitos}`;
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;
  return null;
}

function emailValido(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return false;
  const tld = email.slice(email.lastIndexOf(".") + 1);
  return !["local", "localhost", "test", "invalid", "example", "internal", "lan", "home", "corp", "onion"].includes(tld);
}

function descricaoPedido(order) {
  const numero = order?.numero ?? "";
  const base = `Pedido ${numero ? `#${numero} ` : ""}- BOM PA POXA`;
  return base.slice(0, 120);
}

export function buildCheckoutPayload({ order, config, redirectUrl, webhookUrl, expiresInMinutes = 30 }) {
  const totalCents = toCents(order?.total);
  if (totalCents < 100) {
    throw new Error("A InfinitePay exige valor mínimo de R$ 1,00 para gerar o link.");
  }

  const expiraEm = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const body = {
    order_nsu: String(order.id),
    redirect_url: redirectUrl,
    items: [
      {
        quantity: 1,
        price: totalCents,
        description: descricaoPedido(order),
      },
    ],
    options: {
      assured_installments: 0,
      require_delivery_address: false,
      single_payment: true,
      valid_until: expiraEm,
      payment_methods_enabled: ["credit_card", "pix"],
    },
    webhook: {
      url: webhookUrl,
      events: ["paid", "settled", "canceled", "refunded", "payment_failed"],
    },
  };

  const cliente = {};
  if (order.cliente_nome) cliente.name = String(order.cliente_nome);
  if (emailValido(order.cliente_email)) cliente.email = String(order.cliente_email).trim();
  const telefone = phoneE164Br(order.cliente_telefone);
  if (telefone) cliente.phone_number = telefone;
  if (Object.keys(cliente).length) body.customer = cliente;

  if (order.modalidade === "delivery") {
    const endereco = {
      cep: onlyDigits(order.cep) || undefined,
      street: order.endereco || undefined,
      number: order.numero_endereco || undefined,
      neighborhood: order.bairro || undefined,
      city: order.cidade || undefined,
      complement: order.complemento || undefined,
    };
    const limpo = Object.fromEntries(Object.entries(endereco).filter(([, valor]) => Boolean(valor)));
    if (Object.keys(limpo).length) body.address = limpo;
  }

  return body;
}

export function extractCheckoutUrl(response) {
  const url = response?.url ?? response?.checkout_url ?? response?.link ?? null;
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function parseOrderNsu(value) {
  const bruto = String(value ?? "").trim();
  if (!bruto) return "";
  return bruto.startsWith("bompapoxa:") ? bruto.slice("bompapoxa:".length) : bruto;
}

export function parseWebhookEvent({ query = {}, body = {}, header = {} } = {}) {
  const orderNsu = parseOrderNsu(
    body?.order_nsu ?? body?.orderNsu ?? query?.order_nsu ?? query?.orderNsu ?? "",
  );
  const transactionNsu = String(
    body?.transaction_nsu ?? body?.transactionNsu ?? query?.transaction_nsu ?? query?.transactionNsu ?? "",
  ).trim();
  const slug = String(
    body?.invoice_slug ?? body?.slug ?? query?.invoice_slug ?? query?.slug ?? "",
  ).trim();
  const event =
    body?.event ??
    body?.event_type ??
    body?.eventType ??
    header?.event ??
    query?.event ??
    body?.status ??
    body?.type ??
    body?.action ??
    query?.status ??
    "";
  const eventName = normalizeEventName(event);
  const amount = body?.amount ?? query?.amount ?? null;
  const paidAmount = body?.paid_amount ?? query?.paid_amount ?? null;
  const captureMethod = String(
    body?.capture_method ?? body?.captureMethod ?? query?.capture_method ?? "",
  ).trim();
  const receiptUrl = String(body?.receipt_url ?? body?.receiptUrl ?? query?.receipt_url ?? "").trim();
  const eventKey = [
    "infinitepay",
    orderNsu || "sem-pedido",
    transactionNsu || "sem-transacao",
    slug || "sem-fatura",
    eventName || `check:${amount ?? ""}:${paidAmount ?? ""}`,
  ].join("|");

  return {
    orderNsu,
    transactionNsu,
    slug,
    event: eventName,
    amount,
    paidAmount,
    captureMethod,
    receiptUrl,
    eventKey,
    raw: Boolean(orderNsu && (transactionNsu || slug)),
  };
}

export function normalizePaymentCheck(check, { expectedTotal, event } = {}) {
  if (!check || typeof check !== "object") {
    throw new Error("A InfinitePay não retornou o status do pagamento.");
  }
  if (check.success === false) {
    return {
      status: statusFromEvent(event) ?? "erro",
      statusGateway: "success_false",
      pago: false,
      amount: null,
      paidAmount: null,
      metodo: captureMethodToTipo(check.capture_method),
      tipo: captureMethodToTipo(check.capture_method),
    };
  }

  const amount = Number(check.amount);
  const paidAmount = Number(check.paid_amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("A InfinitePay retornou valor inválido na consulta do pagamento.");
  }
  if (expectedTotal !== undefined && !amountsMatchCents(expectedTotal, amount)) {
    throw new Error(
      `Valor divergente: pedido R$ ${Number(expectedTotal).toFixed(2)} x InfinitePay R$ ${(amount / 100).toFixed(2)}.`,
    );
  }

  const statusEvento = statusFromEvent(event);
  const eventoNegativoContraditorio =
    check.paid === true && ["cancelado", "recusado"].includes(statusEvento ?? "");
  const statusEfetivo = eventoNegativoContraditorio ? null : statusEvento;
  const paid =
    check.paid === true &&
    check.success !== false &&
    !["cancelado", "estornado", "recusado"].includes(statusEfetivo ?? "");
  const tipo = captureMethodToTipo(check.capture_method);
  const status = statusEfetivo && statusEfetivo !== "pendente" ? statusEfetivo : paid ? "aprovado" : "pendente";

  return {
    status,
    statusGateway: paid ? "paid" : String(event || "pending"),
    pago: paid,
    amount,
    paidAmount: Number.isFinite(paidAmount) ? paidAmount : amount,
    metodo: tipo,
    tipo,
    captureMethod: String(check.capture_method ?? ""),
    installments: Number.isFinite(Number(check.installments)) ? Number(check.installments) : null,
  };
}

export function safeErrorMessage(error, fallback = "Não foi possível concluir a operação com a InfinitePay.") {
  const bruto =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "";
  const limpo = bruto
    .replace(/inchk_[A-Za-z0-9._-]+/g, "inchk_***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/\s+/g, " ")
    .trim();
  return (limpo || fallback).slice(0, 500);
}

export function statusIsFinal(status) {
  return TERMINAL.has(String(status ?? ""));
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
  }[status] ?? "Aguardando pagamento";
}

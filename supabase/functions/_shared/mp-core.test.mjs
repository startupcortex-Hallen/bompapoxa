import assert from "node:assert/strict";
import test from "node:test";
import {
  amountsMatch,
  buildPixOrderBody,
  buildPreferenceBody,
  extractWebhookEvent,
  normalizeMpStatus,
  normalizeOrderResource,
  normalizePaymentResource,
  safeErrorMessage,
  validateWebhookSignature,
} from "./mp-core.mjs";

const encoder = new TextEncoder();

test("normaliza status do Mercado Pago", () => {
  assert.equal(normalizeMpStatus("approved"), "aprovado");
  assert.equal(normalizeMpStatus("processed"), "aprovado");
  assert.equal(normalizeMpStatus("rejected"), "recusado");
  assert.equal(normalizeMpStatus("pending"), "pendente");
  assert.equal(normalizeMpStatus("in_process"), "em_processamento");
  assert.equal(normalizeMpStatus("cancelled"), "cancelado");
  assert.equal(normalizeMpStatus("expired"), "expirado");
  assert.equal(normalizeMpStatus("refunded"), "estornado");
  assert.equal(normalizeMpStatus("failed"), "recusado");
});

test("mapeia order PIX pendente e aprovada", () => {
  const pendente = normalizeOrderResource({
    id: "ORD01",
    external_reference: "bompapoxa:pedido-1",
    total_amount: "50.00",
    status: "action_required",
    status_detail: "waiting_transfer",
    transactions: {
      payments: [
        {
          id: "PAY01",
          status: "action_required",
          status_detail: "waiting_transfer",
          payment_method: { id: "pix", type: "bank_transfer", qr_code: "copia-e-cola", qr_code_base64: "base64" },
        },
      ],
    },
  });
  assert.equal(pendente.status, "pendente");
  assert.equal(pendente.tipo, "pix");
  assert.equal(pendente.qrCode, "copia-e-cola");
  assert.equal(pendente.mpOrderId, "ORD01");
  assert.equal(pendente.mpPaymentId, "PAY01");

  const aprovada = normalizeOrderResource({
    id: "ORD02",
    external_reference: "bompapoxa:pedido-2",
    total_amount: "75.00",
    total_paid_amount: "75.00",
    status: "processed",
    transactions: { payments: [{ id: "PAY02", status: "processed", status_detail: "accredited", payment_method: { id: "pix" } }] },
  });
  assert.equal(aprovada.status, "aprovado");
  assert.equal(aprovada.paidAmount, "75.00");
});

test("mapeia pagamento de cartão do Checkout Pro", () => {
  const pago = normalizePaymentResource({
    id: 987654,
    external_reference: "bompapoxa:pedido-3",
    transaction_amount: 120.5,
    status: "approved",
    status_detail: "accredited",
    payment_method_id: "master",
    payment_type_id: "credit_card",
  });
  assert.equal(pago.status, "aprovado");
  assert.equal(pago.tipo, "cartao");
  assert.equal(pago.mpPaymentId, "987654");
  assert.ok(amountsMatch(120.5, "120.50"));
  assert.equal(amountsMatch(120.5, 120.49), false);
});

test("valida assinatura HMAC do webhook", async () => {
  const secret = "segredo-de-teste";
  const ts = "1704908010";
  const dataId = "123456";
  const requestId = "req-abc";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = Buffer.from(await crypto.subtle.sign("HMAC", key, encoder.encode(manifest))).toString("hex");

  assert.equal(
    await validateWebhookSignature({
      xSignature: `ts=${ts},v1=${assinatura}`,
      xRequestId: requestId,
      dataId,
      secret,
    }),
    true,
  );
  assert.equal(
    await validateWebhookSignature({
      xSignature: `ts=${ts},v1=${assinatura}`,
      xRequestId: requestId,
      dataId: "outro-id",
      secret,
    }),
    false,
  );
  assert.equal(
    await validateWebhookSignature({
      xSignature: `ts=${ts},v1=${assinatura}`,
      xRequestId: requestId,
      dataId,
      secret: "outro-segredo",
    }),
    false,
  );
});

test("extrai evento de webhook de order e payment", () => {
  const order = extractWebhookEvent({
    query: { "data.id": "ORD01", type: "order" },
    body: { action: "order.processed", date_created: "2026-11-18T10:00:00Z", data: { id: "ORD01", status: "processed" } },
  });
  assert.equal(order.topic, "order");
  assert.equal(order.dataId, "ORD01");
  assert.match(order.eventKey, /order\|ORD01\|order\.processed/);

  const payment = extractWebhookEvent({
    query: {},
    body: { id: 123, type: "payment", action: "payment.updated", data: { id: "999" } },
  });
  assert.equal(payment.topic, "payment");
  assert.equal(payment.dataId, "999");
  assert.match(payment.eventKey, /payment\|999\|payment\.updated\|123/);
});

test("monta payload PIX e preferência sem confiar no navegador", () => {
  const order = { id: "pedido-1", numero: 1001, total: 50, modalidade: "delivery" };
  const pix = buildPixOrderBody({ order, payerEmail: "cliente@example.com" });
  assert.equal(pix.total_amount, "50.00");
  assert.equal(pix.external_reference, "bompapoxa:pedido-1");
  assert.equal(pix.transactions.payments[0].payment_method.id, "pix");
  assert.throws(() => buildPixOrderBody({ order, payerEmail: "" }));

  const preference = buildPreferenceBody({
    order,
    payerEmail: "cliente@example.com",
    backUrls: {
      success: "https://exemplo/pedido?id=1&token=2",
      failure: "https://exemplo/pedido?id=1&token=2",
      pending: "https://exemplo/pedido?id=1&token=2",
    },
    notificationUrl: "https://projeto.supabase.co/functions/v1/mercadopago-webhook",
  });
  assert.equal(preference.items[0].unit_price, 50);
  assert.equal(preference.metadata.pedido_id, "pedido-1");
  assert.equal(preference.auto_return, "approved");
});

test("não vaza tokens em mensagens de erro", () => {
  const mensagem = safeErrorMessage("Authorization: Bearer APP_USR-123456789-abcdef falhou");
  assert.doesNotMatch(mensagem, /APP_USR-123456789-abcdef/);
  assert.match(mensagem, /\*\*\*/);
});

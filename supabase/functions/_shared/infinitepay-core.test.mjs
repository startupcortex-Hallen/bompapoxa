import assert from "node:assert/strict";
import test from "node:test";
import {
  amountsMatchCents,
  buildCheckoutPayload,
  captureMethodToTipo,
  extractCheckoutUrl,
  normalizeEventName,
  normalizePaymentCheck,
  parseOrderNsu,
  parseWebhookEvent,
  safeErrorMessage,
  statusFromEvent,
  toCents,
} from "./infinitepay-core.mjs";

function pedido(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    numero: 1001,
    total: 114.12,
    modalidade: "delivery",
    cliente_nome: "Maria da Silva",
    cliente_email: "maria@example.com",
    cliente_telefone: "(71) 99999-9999",
    cep: "40000-000",
    endereco: "Rua da Bahia",
    numero_endereco: "10",
    complemento: "Apto 12",
    bairro: "Centro",
    cidade: "Salvador",
    ...overrides,
  };
}

test("normaliza eventos e valores monetários da InfinitePay", () => {
  assert.equal(normalizeEventName("PAYMENT.PAID"), "paid");
  assert.equal(statusFromEvent("paid"), "aprovado");
  assert.equal(statusFromEvent("settled"), "aprovado");
  assert.equal(statusFromEvent("canceled"), "cancelado");
  assert.equal(statusFromEvent("refunded"), "estornado");
  assert.equal(statusFromEvent("payment_failed"), "recusado");
  assert.equal(statusFromEvent("created"), "pendente");
  assert.equal(toCents("114,12"), 11412);
  assert.equal(toCents(10), 1000);
  assert.equal(amountsMatchCents(114.12, 11412), true);
  assert.equal(amountsMatchCents(114.12, 11411), false);
  assert.equal(captureMethodToTipo("pix"), "pix");
  assert.equal(captureMethodToTipo("credit_card"), "cartao");
  assert.equal(captureMethodToTipo(""), "online");
});

test("monta o payload do Checkout Integrado em centavos e sem dados do navegador", () => {
  const payload = buildCheckoutPayload({
    order: pedido(),
    config: { handle: "bompapoxa" },
    redirectUrl: "https://loja.example.com/pedido?id=1&token=2",
    webhookUrl: "https://projeto.supabase.co/functions/v1/infinitepay-webhook",
  });

  assert.equal(payload.order_nsu, pedido().id);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].price, 11412);
  assert.equal(payload.options.single_payment, true);
  assert.deepEqual(payload.options.payment_methods_enabled, ["credit_card", "pix"]);
  assert.equal(payload.webhook.events.includes("paid"), true);
  assert.equal(payload.customer.email, "maria@example.com");
  assert.equal(payload.customer.phone_number, "+5571999999999");
  assert.equal(payload.address.street, "Rua da Bahia");
  assert.equal(payload.redirect_url, "https://loja.example.com/pedido?id=1&token=2");

  const semEmailInvalido = buildCheckoutPayload({
    order: pedido({ cliente_email: "teste@bompapoxa.local", cliente_telefone: "" }),
    config: { handle: "bompapoxa" },
    redirectUrl: "https://loja.example.com/pedido?id=1&token=2",
    webhookUrl: "https://projeto.supabase.co/functions/v1/infinitepay-webhook",
  });
  assert.equal("email" in semEmailInvalido.customer, false);
  assert.equal("phone_number" in semEmailInvalido.customer, false);

  assert.throws(() =>
    buildCheckoutPayload({
      order: pedido({ total: 0.99 }),
      config: { handle: "bompapoxa" },
      redirectUrl: "https://loja.example.com",
      webhookUrl: "https://projeto.supabase.co/functions/v1/infinitepay-webhook",
    }),
  );
});

test("valida link de checkout retornado pela API", () => {
  assert.equal(
    extractCheckoutUrl({ url: "https://checkout.infinitepay.com.br/shop?lenc=abc" }),
    "https://checkout.infinitepay.com.br/shop?lenc=abc",
  );
  assert.equal(extractCheckoutUrl({ url: "http://checkout.infinitepay.com.br/shop" }), null);
  assert.equal(extractCheckoutUrl({}), null);
});

test("interpreta pagamento aprovado e não aprovado", () => {
  const pagoPix = normalizePaymentCheck(
    { success: true, paid: true, amount: 11412, paid_amount: 11412, installments: 1, capture_method: "pix" },
    { expectedTotal: 114.12 },
  );
  assert.equal(pagoPix.status, "aprovado");
  assert.equal(pagoPix.tipo, "pix");
  assert.equal(pagoPix.pago, true);

  const pagoCartao = normalizePaymentCheck(
    { success: true, paid: true, amount: 11412, paid_amount: 11412, installments: 3, capture_method: "credit_card" },
    { expectedTotal: 114.12 },
  );
  assert.equal(pagoCartao.status, "aprovado");
  assert.equal(pagoCartao.tipo, "cartao");

  const pendente = normalizePaymentCheck(
    { success: true, paid: false, amount: 11412, paid_amount: 0, installments: 1, capture_method: "pix" },
    { expectedTotal: 114.12 },
  );
  assert.equal(pendente.status, "pendente");
  assert.equal(pendente.pago, false);

  assert.throws(() =>
    normalizePaymentCheck(
      { success: true, paid: true, amount: 1, paid_amount: 1, installments: 1, capture_method: "pix" },
      { expectedTotal: 114.12 },
    ),
  );

  const cancelamentoContraditorio = normalizePaymentCheck(
    { success: true, paid: true, amount: 11412, paid_amount: 11412, installments: 1, capture_method: "pix" },
    { expectedTotal: 114.12, event: "canceled" },
  );
  assert.equal(cancelamentoContraditorio.status, "aprovado");

  const estorno = normalizePaymentCheck(
    { success: true, paid: true, amount: 11412, paid_amount: 11412, installments: 1, capture_method: "credit_card" },
    { expectedTotal: 114.12, event: "refunded" },
  );
  assert.equal(estorno.status, "estornado");
});

test("extrai webhook da InfinitePay e exige order_nsu", () => {
  const paid = parseWebhookEvent({
    body: {
      invoice_slug: "abc123",
      amount: 11412,
      paid_amount: 11412,
      installments: 1,
      capture_method: "pix",
      transaction_nsu: "tx-uuid",
      order_nsu: "bompapoxa:pedido-123",
      receipt_url: "https://comprovante.example.com/123",
    },
  });
  assert.equal(paid.orderNsu, "pedido-123");
  assert.equal(paid.transactionNsu, "tx-uuid");
  assert.equal(paid.slug, "abc123");
  assert.equal(paid.amount, 11412);
  assert.equal(paid.captureMethod, "pix");
  assert.match(paid.eventKey, /infinitepay\|pedido-123\|tx-uuid\|abc123/);

  const cancelado = parseWebhookEvent({
    query: { event: "canceled" },
    body: { order_nsu: "pedido-123", transaction_nsu: "tx-uuid", invoice_slug: "abc123" },
  });
  assert.equal(cancelado.event, "canceled");

  const porHeader = parseWebhookEvent({
    header: { event: "refunded" },
    body: { order_nsu: "pedido-123", transaction_nsu: "tx-uuid", invoice_slug: "abc123" },
  });
  assert.equal(porHeader.event, "refunded");

  const eventoDoCorpoTemPrioridade = parseWebhookEvent({
    query: { event: "canceled" },
    body: { event: "paid", order_nsu: "pedido-123", transaction_nsu: "tx-uuid", invoice_slug: "abc123" },
  });
  assert.equal(eventoDoCorpoTemPrioridade.event, "paid");
  assert.equal(parseOrderNsu("bompapoxa:pedido-9"), "pedido-9");
  assert.equal(parseOrderNsu("pedido-9"), "pedido-9");
});

test("não vaza a API Key em mensagens de erro", () => {
  const mensagem = safeErrorMessage("X-Api-Key: inchk_segredo-123 falhou");
  assert.doesNotMatch(mensagem, /inchk_segredo-123/);
  assert.match(mensagem, /inchk_\*\*\*/);
});

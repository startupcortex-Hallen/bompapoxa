import assert from "node:assert/strict";
import test from "node:test";
import { formatTicket } from "../format-ticket.mjs";

function pedidoBase(overrides = {}) {
  return {
    pedido_id: "pedido-1",
    numero: 1001,
    criado_em: "2026-11-18T17:30:00.000Z",
    status: "novo",
    cliente_nome: "Maria da Silva",
    cliente_telefone: "(71) 99999-9999",
    modalidade: "delivery",
    endereco: {
      endereco: "Rua da Bahia",
      numero: "10",
      complemento: "Apto 12",
      bairro: "Centro",
      cidade: "Salvador",
      cep: "40000-000",
      referencia: "Próximo à praça",
    },
    itens: [
      {
        nome: "X-Burger",
        quantidade: 2,
        preco_unitario: 25,
        adicionais: [
          { nome: "Bacon", preco: 4 },
          { nome: "Queijo extra", preco: 3 },
        ],
        observacao: "Sem cebola.",
      },
      {
        nome: "Combo Enrolado",
        quantidade: 1,
        preco_unitario: 35,
        adicionais: [],
        observacao: "Inclui: Kebab Kafta, Batata 170g, Refrigerante lata | Entregar separado",
      },
    ],
    observacoes: "Campainha com defeito. Ligar ao chegar.",
    forma_pagamento: "pix",
    pagamento_provedor: "mercadopago",
    pagamento_online_tipo: "pix",
    pagamento_status: "pendente",
    pagamento_online: { status: "pendente", tipo: "pix" },
    troco_para: null,
    subtotal: 85,
    taxa_entrega: 8,
    desconto: 5,
    total: 88,
    cupom_codigo: "BEMVINDO",
    estabelecimento: {
      nome: "BOM PA POXA",
      endereco: "Rua da Loja, 1",
      bairro: "Centro",
      cidade: "Salvador",
    },
    ...overrides,
  };
}

test("gera cupom de entrega em 80 mm sem linhas acima da largura", () => {
  const cupom = formatTicket(pedidoBase(), 80);
  const linhas = cupom.split("\n");
  assert.ok(linhas.every((linha) => linha.length <= 48), "80 mm deve ter no máximo 48 colunas");
  assert.match(cupom, /BOM PA POXA/);
  assert.match(cupom, /PEDIDO Nº 1001/);
  assert.match(cupom, /CLIENTE:/);
  assert.match(cupom, /Maria da Silva/);
  assert.match(cupom, /ENTREGA/);
  assert.match(cupom, /2x X-BURGER/);
  assert.match(cupom, /Adicionais:/);
  assert.match(cupom, /- Bacon/);
  assert.match(cupom, /- Queijo extra/);
  assert.match(cupom, /Observação do item:/);
  assert.match(cupom, /Sem cebola\./);
  assert.match(cupom, /Inclui:/);
  assert.match(cupom, /- Kebab Kafta/);
  assert.match(cupom, /Entregar separado/);
  assert.match(cupom, /Campainha com defeito/);
  assert.match(cupom, /ENDEREÇO DE ENTREGA:/);
  assert.match(cupom, /Rua da Bahia/);
  assert.match(cupom, /PIX ONLINE \(MERCADO PAGO\)/);
  assert.match(cupom, /AGUARDANDO PAGAMENTO/);
  assert.match(cupom, /Desconto:/);
  assert.match(cupom, /TOTAL DO PEDIDO:/);
  assert.match(cupom, /\*\*\* PAGAMENTO PENDENTE \*\*\*/);
});

test("gera cupom de retirada em 58 mm", () => {
  const cupom = formatTicket(
    pedidoBase({
      modalidade: "retirada",
      endereco: null,
      forma_pagamento: "dinheiro",
      pagamento_provedor: "manual",
      pagamento_online_tipo: null,
      pagamento_online: null,
      pagamento_status: "pendente",
      troco_para: 100,
    }),
    58,
  );
  const linhas = cupom.split("\n");
  assert.ok(linhas.every((linha) => linha.length <= 32), "58 mm deve ter no máximo 32 colunas");
  assert.match(cupom, /RETIRADA/);
  assert.match(cupom, /RETIRADA NO ESTABELECIMENTO/);
  assert.match(cupom, /DINHEIRO/);
  assert.match(cupom, /Troco para:/);
  assert.match(cupom, /PAGAMENTO PENDENTE/);
  assert.doesNotMatch(cupom, /ENDEREÇO DE ENTREGA/);
});

test("destaca pagamento aprovado e não imprime alerta de pendência", () => {
  const cupom = formatTicket(
    pedidoBase({
      pagamento_status: "pago",
      pagamento_online: { status: "aprovado", tipo: "pix" },
      forma_pagamento: "pix",
    }),
    80,
  );
  assert.match(cupom, /PAGO/);
  assert.doesNotMatch(cupom, /\*\*\* PAGAMENTO PENDENTE \*\*\*/);
});

test("imprime cupom de teste", () => {
  const cupom = formatTicket(
    {
      teste: true,
      gerado_em: "2026-11-18T17:30:00.000Z",
      estabelecimento: { nome: "BOM PA POXA" },
    },
    58,
  );
  assert.match(cupom, /TESTE DE IMPRESSÃO/);
  assert.match(cupom, /ponte local de impressão está\s+funcionando/);
  assert.ok(cupom.split("\n").every((linha) => linha.length <= 32));
});

test("não perde observações longas e quebra palavras grandes", () => {
  const cupom = formatTicket(
    pedidoBase({
      observacoes: "x".repeat(120),
      itens: [
        {
          nome: "Produto com nome muito comprido para testar a quebra de linha do cupom",
          quantidade: 1,
          adicionais: [],
          observacao: "",
        },
      ],
    }),
    58,
  );
  assert.ok(cupom.split("\n").every((linha) => linha.length <= 32));
  assert.match(cupom, /xxxxxxxx/);
});

import { describe, expect, it } from "vitest";
import { formatTicket, formaPagamentoLabel, larguraColunas, situacaoPagamentoLabel, type TicketPayload } from "./ticket";

const payload: TicketPayload = {
  numero: 1005,
  criado_em: "2026-11-22T19:34:04.691Z",
  cliente_nome: "Cliente Teste",
  cliente_telefone: "(71) 98888-7777",
  modalidade: "delivery",
  endereco: {
    cep: "40000-000",
    endereco: "Rua da Bahia",
    numero: "10",
    complemento: "Apto 12",
    bairro: "Centro",
    cidade: "Salvador",
    referencia: "Próximo à praça",
  },
  itens: [
    {
      nome: "Ligeirinho da Moto",
      quantidade: 2,
      preco_unitario: 25,
      adicionais: [{ nome: "Bacon extra", preco: 4 }],
      observacao: "Sem cebola",
    },
  ],
  observacoes: "Entregar no portão lateral.",
  forma_pagamento: "pix",
  pagamento_provedor: "infinitepay",
  pagamento_online_tipo: "pix",
  pagamento_status: "pago",
  pagamento_online: { status: "aprovado" },
  subtotal: 58,
  taxa_entrega: 6,
  desconto: 0,
  total: 64,
  estabelecimento: {
    nome: "BOM PA POXA",
    endereco: "Rua X",
    bairro: "Centro",
    cidade: "Salvador",
  },
};

describe("formatTicket", () => {
  it("respeita 32 colunas em 58 mm", () => {
    const texto = formatTicket(payload, 58);
    for (const linha of texto.split("\n")) {
      expect(linha.length).toBeLessThanOrEqual(32);
    }
    expect(texto).toContain("PEDIDO Nº 1005");
    expect(texto).toContain("PIX ONLINE (INFINITEPAY)");
    expect(texto).toContain("PAGO");
    expect(texto).toContain("Bacon extra");
    expect(texto).toContain("Próximo à praça");
    expect(texto).not.toContain("PAGAMENTO PENDENTE");
  });

  it("respeita 48 colunas em 80 mm", () => {
    const texto = formatTicket(payload, 80);
    for (const linha of texto.split("\n")) {
      expect(linha.length).toBeLessThanOrEqual(48);
    }
    expect(larguraColunas(80)).toBe(48);
    expect(larguraColunas(58)).toBe(32);
  });

  it("destaca pagamento pendente", () => {
    const texto = formatTicket({ ...payload, pagamento_status: "pendente", pagamento_online: { status: "pendente" } }, 80);
    expect(texto).toContain("AGUARDANDO PAGAMENTO");
    expect(texto).toContain("*** PAGAMENTO PENDENTE ***");
  });

  it("gera cupom de teste", () => {
    const texto = formatTicket({ teste: true, gerado_em: payload.criado_em, estabelecimento: payload.estabelecimento }, 80);
    expect(texto).toContain("TESTE DE IMPRESSÃO");
    expect(texto).toMatch(/impressora\s+Bluetooth está funcionando/);
  });

  it("rotula pagamento online e manual", () => {
    expect(formaPagamentoLabel(payload)).toBe("PIX ONLINE (INFINITEPAY)");
    expect(formaPagamentoLabel({ ...payload, pagamento_provedor: "manual", pagamento_online_tipo: null, forma_pagamento: "dinheiro" })).toBe("DINHEIRO");
    expect(situacaoPagamentoLabel(payload)).toBe("PAGO");
    expect(situacaoPagamentoLabel({ ...payload, pagamento_status: "pendente", pagamento_online: { status: "em_processamento" } })).toBe("EM PROCESSAMENTO");
  });
});

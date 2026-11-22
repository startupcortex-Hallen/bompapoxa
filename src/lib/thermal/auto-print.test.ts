import { describe, expect, it } from "vitest";
import { selecionarPedidosNovos } from "./auto-print";

const pedido = (id: string, numero: number, status: string) => ({ id, numero, status });

describe("selecionarPedidosNovos", () => {
  it("seleciona apenas pedidos novos e ainda não vistos", () => {
    const vistos = new Set(["1"]);
    const pedidos = [pedido("1", 101, "novo"), pedido("2", 102, "novo"), pedido("3", 103, "em_preparo")];
    expect(selecionarPedidosNovos(pedidos, vistos)).toEqual([pedido("2", 102, "novo")]);
  });

  it("não repete pedidos já processados", () => {
    const vistos = new Set(["1", "2"]);
    const pedidos = [pedido("1", 101, "novo"), pedido("2", 102, "novo")];
    expect(selecionarPedidosNovos(pedidos, vistos)).toEqual([]);
  });

  it("ignora pedidos que saíram do status novo", () => {
    const pedidos = [pedido("1", 101, "pronto"), pedido("2", 102, "cancelado")];
    expect(selecionarPedidosNovos(pedidos, new Set())).toEqual([]);
  });

  it("não imprime pedido online antes da confirmação da InfinitePay", () => {
    const pendente = { id: "1", numero: 101, status: "novo", pagamento_provedor: "infinitepay", status_pagamento: "pendente" };
    const pago = { id: "2", numero: 102, status: "novo", pagamento_provedor: "infinitepay", status_pagamento: "pago" };
    const manual = { id: "3", numero: 103, status: "novo", pagamento_provedor: "manual", status_pagamento: "pendente" };
    expect(selecionarPedidosNovos([pendente, pago, manual], new Set())).toEqual([pago, manual]);
  });
});

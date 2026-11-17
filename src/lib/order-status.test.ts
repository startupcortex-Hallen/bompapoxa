import { describe, expect, it } from "vitest";
import { etapasPedido, ehFinal, indiceEtapa, proximosStatus } from "./order-status";

describe("order status", () => {
  it("avança o pedido de entrega", () => {
    expect(proximosStatus({ status: "novo", modalidade: "delivery" })).toEqual(["em_preparo", "cancelado"]);
    expect(proximosStatus({ status: "em_preparo", modalidade: "delivery" })).toEqual(["pronto", "cancelado"]);
    expect(proximosStatus({ status: "pronto", modalidade: "delivery" })).toEqual(["saiu_entrega", "cancelado"]);
    expect(proximosStatus({ status: "saiu_entrega", modalidade: "delivery" })).toEqual(["entregue", "cancelado"]);
  });

  it("avança o pedido de retirada sem etapa de entrega", () => {
    expect(proximosStatus({ status: "pronto", modalidade: "retirada" })).toEqual(["retirado", "cancelado"]);
    expect(etapasPedido("retirada")).not.toContain("saiu_entrega");
  });

  it("não avança pedidos finalizados", () => {
    expect(proximosStatus({ status: "entregue", modalidade: "delivery" })).toEqual([]);
    expect(proximosStatus({ status: "cancelado", modalidade: "retirada" })).toEqual([]);
    expect(ehFinal("entregue")).toBe(true);
    expect(ehFinal("cancelado")).toBe(true);
  });

  it("calcula o índice da etapa atual", () => {
    expect(indiceEtapa({ status: "novo", modalidade: "delivery" })).toBe(0);
    expect(indiceEtapa({ status: "pronto", modalidade: "delivery" })).toBe(2);
    expect(indiceEtapa({ status: "cancelado", modalidade: "delivery" })).toBe(-1);
  });
});

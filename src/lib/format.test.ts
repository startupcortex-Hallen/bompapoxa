import { describe, expect, it } from "vitest";
import { formatarTelefone, moedaBRL, numero, somenteDigitos, tempoRelativo } from "./format";

describe("format", () => {
  it("converte números vindos do banco", () => {
    expect(numero("39.90")).toBe(39.9);
    expect(numero("39,90")).toBe(39.9);
    expect(numero(null)).toBe(0);
    expect(numero("abc")).toBe(0);
  });

  it("formata valores em real brasileiro", () => {
    const texto = moedaBRL(39.9);
    expect(texto).toContain("R$");
    expect(texto).toContain("39,90");
  });

  it("formata telefone com DDD", () => {
    expect(somenteDigitos("(71) 99999-9999")).toBe("71999999999");
    expect(formatarTelefone("71999999999")).toBe("(71) 99999-9999");
  });

  it("descreve tempo relativo", () => {
    const agora = new Date("2026-11-17T12:00:00Z").getTime();
    expect(tempoRelativo("2026-11-17T11:59:40Z", agora)).toBe("agora");
    expect(tempoRelativo("2026-11-17T11:45:00Z", agora)).toBe("15 min");
    expect(tempoRelativo("2026-11-17T09:00:00Z", agora)).toBe("3 h");
  });
});

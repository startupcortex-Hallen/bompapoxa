import { describe, expect, it } from "vitest";
import { buildTicketEscPos, CP850_HIGH, encodeCp850 } from "./escpos";
import { formatTicket } from "./ticket";

describe("encodeCp850", () => {
  it("tem a tabela completa de 128 caracteres", () => {
    expect(CP850_HIGH.length).toBe(128);
  });

  it("codifica acentos portugueses", () => {
    expect(Array.from(encodeCp850("AÇÃO"))).toEqual([0x41, 0x80, 0xc7, 0x4f]);
    expect(Array.from(encodeCp850("ção"))).toEqual([0x87, 0xc6, 0x6f]);
    expect(Array.from(encodeCp850("PÃO"))).toEqual([0x50, 0xc7, 0x4f]);
  });

  it("translitera caracteres fora da tabela", () => {
    expect(Array.from(encodeCp850("—"))).toEqual([0x3f]);
  });
});

describe("buildTicketEscPos", () => {
  it("inicializa, aplica code page e corta o papel", () => {
    const texto = formatTicket({ teste: true, estabelecimento: { nome: "BOM PA POXA" } }, 80);
    const bytes = buildTicketEscPos(texto);
    expect(Array.from(bytes.slice(0, 7))).toEqual([0x1b, 0x40, 0x1b, 0x74, 0x02, 0x1b, 0x61]);
    expect(Array.from(bytes.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it("centraliza e destaca o cabeçalho", () => {
    const bytes = buildTicketEscPos("BOM PA POXA\nPEDIDO Nº 1005\nCLIENTE:\n");
    const array = Array.from(bytes);
    const posicaoCentralizado = array.findIndex((byte, indice) => byte === 0x1b && array[indice + 1] === 0x61 && array[indice + 2] === 1);
    const posicaoNegrito = array.findIndex((byte, indice) => byte === 0x1b && array[indice + 1] === 0x45 && array[indice + 2] === 1);
    expect(posicaoCentralizado).toBeGreaterThan(-1);
    expect(posicaoNegrito).toBeGreaterThan(-1);
  });
});

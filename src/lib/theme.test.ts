import { describe, expect, it } from "vitest";
import { estiloTema, luminancia, textoSobre, validarHex } from "./theme";

describe("theme", () => {
  it("valida cores hexadecimais", () => {
    expect(validarHex("#B23A2A")).toBe(true);
    expect(validarHex("#b23a2a")).toBe(true);
    expect(validarHex("B23A2A")).toBe(false);
    expect(validarHex("#FFF")).toBe(false);
  });

  it("escolhe texto legível sobre a cor", () => {
    expect(textoSobre("#FAF5EC")).toBe("#1F140F");
    expect(textoSobre("#2A1710")).toBe("#FFF9F1");
    expect(luminancia("#FFFFFF")).toBeGreaterThan(luminancia("#000000"));
  });

  it("gera variáveis de tema com fallback", () => {
    const estilo = estiloTema({
      cor_primaria: "#B23A2A",
      cor_secundaria: "#F1E3CF",
      cor_destaque: "#E8A33D",
      cor_fundo: "#FAF5EC",
      cor_texto: "#2A1710",
      tipografia: "fraunces_figtree",
    }) as Record<string, string>;
    expect(estilo["--app-primary"]).toBe("#B23A2A");
    expect(estilo["--app-font-display"]).toContain("Fraunces");

    const invalido = estiloTema({
      cor_primaria: "vermelho",
      cor_secundaria: "#F1E3CF",
      cor_destaque: "#E8A33D",
      cor_fundo: "#FAF5EC",
      cor_texto: "#2A1710",
      tipografia: "desconhecida",
    }) as Record<string, string>;
    expect(invalido["--app-primary"]).toBe("#B23A2A");
    expect(invalido["--app-font-display"]).toContain("Fraunces");
  });
});

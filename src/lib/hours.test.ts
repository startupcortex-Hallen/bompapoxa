import { describe, expect, it } from "vitest";
import { estaAbertoLocal, faixaHorario, relogioBahia, resumoFuncionamento } from "./hours";
import type { Configuracoes, Horario } from "./types";

const config = {
  status_abertura: "automatico",
  aceitando_pedidos: true,
} as Configuracoes;

function horario(overrides: Partial<Horario> & Pick<Horario, "dia_semana">): Horario {
  return {
    id: `h-${overrides.dia_semana}-${overrides.sequencia ?? 1}`,
    dia_semana: overrides.dia_semana,
    sequencia: overrides.sequencia ?? 1,
    fechado: overrides.fechado ?? false,
    abre: overrides.abre ?? "11:00",
    fecha: overrides.fecha ?? "22:00",
    created_at: "",
    updated_at: "",
  };
}

describe("hours", () => {
  it("lê o relógio no fuso America/Bahia", () => {
    const relogio = relogioBahia(new Date("2026-11-16T15:00:00Z"));
    expect(relogio).toEqual({ dia: 1, minutos: 12 * 60 });
  });

  it("abre e fecha pelo horário configurado", () => {
    const horarios = [horario({ dia_semana: 1 })];
    expect(estaAbertoLocal(config, horarios, new Date("2026-11-16T15:00:00Z"))).toBe(true);
    expect(estaAbertoLocal(config, horarios, new Date("2026-11-17T02:00:00Z"))).toBe(false);
  });

  it("respeita horários que atravessam a meia-noite", () => {
    const horarios = [horario({ dia_semana: 1, abre: "18:00", fecha: "02:00" })];
    expect(estaAbertoLocal(config, horarios, new Date("2026-11-17T04:00:00Z"))).toBe(true);
    expect(estaAbertoLocal(config, horarios, new Date("2026-11-17T06:30:00Z"))).toBe(false);
  });

  it("respeita o status forçado e o dia fechado", () => {
    const fechado = { ...config, status_abertura: "fechado" } as Configuracoes;
    const aberto = { ...config, status_abertura: "aberto" } as Configuracoes;
    const horarios = [horario({ dia_semana: 1, fechado: true, abre: null, fecha: null })];
    expect(estaAbertoLocal(fechado, horarios)).toBe(false);
    expect(estaAbertoLocal(aberto, horarios)).toBe(true);
  });

  it("descreve faixas e resumo", () => {
    const h = horario({ dia_semana: 1 });
    expect(faixaHorario(h)).toBe("11:00 às 22:00");
    expect(faixaHorario({ ...h, fechado: true, abre: null, fecha: null })).toBe("Fechado");
    expect(resumoFuncionamento([h], new Date("2026-11-16T15:00:00Z"))).toContain("11:00 às 22:00");
  });
});

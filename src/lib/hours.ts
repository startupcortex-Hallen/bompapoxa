import type { Configuracoes, Horario } from "./types";

export const DIAS = [
  { valor: 0, longo: "Domingo", curto: "Dom" },
  { valor: 1, longo: "Segunda-feira", curto: "Seg" },
  { valor: 2, longo: "Terça-feira", curto: "Ter" },
  { valor: 3, longo: "Quarta-feira", curto: "Qua" },
  { valor: 4, longo: "Quinta-feira", curto: "Qui" },
  { valor: 5, longo: "Sexta-feira", curto: "Sex" },
  { valor: 6, longo: "Sábado", curto: "Sáb" },
] as const;

type Relogio = { dia: number; minutos: number };

export function relogioBahia(agora = new Date()): Relogio {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bahia",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const nomes = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dia = Math.max(0, nomes.indexOf(get("weekday")));
  const minutos = Number(get("hour")) * 60 + Number(get("minute"));
  return { dia, minutos };
}

function minutosDoBanco(valor: string | null): number | null {
  if (!valor) return null;
  const [h, m] = valor.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h! * 60 + m!;
}

export function horariosDoDia(horarios: Horario[], dia: number): Horario[] {
  return horarios.filter((h) => h.dia_semana === dia).sort((a, b) => a.sequencia - b.sequencia);
}

export function estaAbertoLocal(configuracoes: Configuracoes, horarios: Horario[], agora = new Date()): boolean {
  if (configuracoes.status_abertura === "aberto") return true;
  if (configuracoes.status_abertura === "fechado") return false;
  const { dia, minutos } = relogioBahia(agora);
  const ontem = (dia + 6) % 7;
  return horarios.some((h) => {
    if (h.fechado) return false;
    const abre = minutosDoBanco(h.abre);
    const fecha = minutosDoBanco(h.fecha);
    if (abre === null || fecha === null) return false;
    if (h.dia_semana === dia) {
      if (abre < fecha) return minutos >= abre && minutos < fecha;
      return minutos >= abre;
    }
    if (h.dia_semana === ontem) return abre > fecha && minutos < fecha;
    return false;
  });
}

export function faixaHorario(horario: Horario): string {
  if (horario.fechado || !horario.abre || !horario.fecha) return "Fechado";
  return `${horario.abre.slice(0, 5)} às ${horario.fecha.slice(0, 5)}`;
}

export function resumoFuncionamento(horarios: Horario[], agora = new Date()): string {
  const hoje = relogioBahia(agora).dia;
  const lista = horariosDoDia(horarios, hoje).filter((h) => !h.fechado && h.abre && h.fecha);
  if (!lista.length) return "Horários não configurados";
  return lista.map(faixaHorario).join(" • ");
}

export function proximaAbertura(horarios: Horario[], agora = new Date()): string | null {
  const { dia, minutos } = relogioBahia(agora);
  for (let deslocamento = 0; deslocamento < 7; deslocamento++) {
    const alvo = (dia + deslocamento) % 7;
    for (const h of horariosDoDia(horarios, alvo)) {
      if (h.fechado || !h.abre) continue;
      const abre = minutosDoBanco(h.abre);
      if (abre === null) continue;
      if (deslocamento === 0 && abre <= minutos) continue;
      const nomeDia = DIAS[alvo]?.longo ?? "";
      return deslocamento === 0 ? `Hoje às ${h.abre.slice(0, 5)}` : `${nomeDia} às ${h.abre.slice(0, 5)}`;
    }
  }
  return null;
}

export function rotuloAbertura(configuracoes: Configuracoes, horarios: Horario[], aberto: boolean): string {
  if (!configuracoes.aceitando_pedidos) return "Pedidos pausados";
  if (aberto) return "Aberto agora";
  const proxima = proximaAbertura(horarios);
  return proxima ? `Fechado • abre ${proxima.toLowerCase()}` : "Fechado agora";
}

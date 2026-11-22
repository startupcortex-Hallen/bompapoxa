const CP850_HIGH =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»" +
  "░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀" +
  "ÓßÔÒõÕµþÞÚÛÙýÝ¯´≡±‗¾¶§÷¸°¨·¹³²■\u00A0";

const CP850_MAP = (() => {
  const mapa = new Map<string, number>();
  for (let i = 0; i < CP850_HIGH.length; i += 1) {
    mapa.set(CP850_HIGH[i], 128 + i);
  }
  return mapa;
})();

const ESC = 0x1b;
const GS = 0x1d;

function transliterar(char: string): string {
  return char
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

export function encodeCp850(texto: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of texto.replace(/\r\n/g, "\n")) {
    if (char === "\n") {
      bytes.push(0x0a);
      continue;
    }
    const codigo = char.codePointAt(0) ?? 0x3f;
    if (codigo < 128) {
      bytes.push(codigo);
      continue;
    }
    const mapeado = CP850_MAP.get(char);
    if (mapeado !== undefined) {
      bytes.push(mapeado);
      continue;
    }
    for (const substituto of transliterar(char)) {
      bytes.push(substituto.codePointAt(0) ?? 0x3f);
    }
  }
  return Uint8Array.from(bytes);
}

function comando(...bytes: number[]): Uint8Array {
  return Uint8Array.from(bytes);
}

function ehCabecalho(linha: string, indice: number): boolean {
  if (indice === 0) return true;
  return /^PEDIDO\s+N[º°]/i.test(linha.trim());
}

function ehAlerta(linha: string): boolean {
  return /^\*\*\*.*\*\*\*$/.test(linha.trim());
}

function ehTitulo(linha: string): boolean {
  const limpa = linha.trim();
  if (limpa.length < 3 || !limpa.endsWith(":")) return false;
  if (/[a-zà-ÿ]/.test(limpa)) return false;
  return /^[A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ /]+:$/.test(limpa);
}

function ehTotal(linha: string): boolean {
  return /^TOTAL DO PEDIDO:/i.test(linha.trim());
}

export type EscPosOptions = {
  cut?: boolean;
  feed?: number;
};

export function buildTicketEscPos(texto: string, options: EscPosOptions = {}): Uint8Array {
  const { cut = true, feed = 5 } = options;
  const partes: Uint8Array[] = [comando(ESC, 0x40), comando(ESC, 0x74, 0x02), comando(ESC, 0x61, 0x00)];

  let alinhamento = 0;
  let negrito = false;
  let tamanho = 0;

  const definirAlinhamento = (valor: 0 | 1 | 2) => {
    if (alinhamento === valor) return;
    alinhamento = valor;
    partes.push(comando(ESC, 0x61, valor));
  };

  const definirNegrito = (ativo: boolean) => {
    if (negrito === ativo) return;
    negrito = ativo;
    partes.push(comando(ESC, 0x45, ativo ? 1 : 0));
  };

  const definirTamanho = (valor: 0 | 1 | 0x11) => {
    if (tamanho === valor) return;
    tamanho = valor;
    partes.push(comando(GS, 0x21, valor));
  };

  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  linhas.forEach((linha, indice) => {
    const cabecalho = ehCabecalho(linha, indice);
    const alerta = ehAlerta(linha);
    const titulo = ehTitulo(linha);
    const total = ehTotal(linha);

    definirAlinhamento(cabecalho || alerta ? 1 : 0);
    definirNegrito(cabecalho || alerta || titulo || total);
    definirTamanho(cabecalho ? 1 : 0);
    partes.push(encodeCp850(linha));
    partes.push(comando(0x0a));
  });

  definirNegrito(false);
  definirTamanho(0);
  definirAlinhamento(0);
  partes.push(comando(ESC, 0x64, feed));
  if (cut) partes.push(comando(GS, 0x56, 0x42, 0x00));

  const totalBytes = partes.reduce((soma, parte) => soma + parte.length, 0);
  const resultado = new Uint8Array(totalBytes);
  let offset = 0;
  for (const parte of partes) {
    resultado.set(parte, offset);
    offset += parte.length;
  }
  return resultado;
}

export function buildTestEscPos(texto: string): Uint8Array {
  return buildTicketEscPos(texto, { cut: true, feed: 4 });
}

export { CP850_HIGH };

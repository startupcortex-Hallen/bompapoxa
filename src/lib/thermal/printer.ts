import { buildTestEscPos, buildTicketEscPos } from "./escpos";
import {
  bleNativoConectado,
  classicoNativoConectado,
  conectarImpressoraBleNativa,
  conectarImpressoraClassica,
  desconectarImpressoraBleNativa,
  desconectarImpressoraClassica,
  enviarImpressoraBleNativa,
  enviarImpressoraClassica,
  listarImpressorasClassicas,
  plataformaNativa,
  selecionarImpressoraBleNativa,
  suportaClassicoNativo,
} from "./native-bluetooth";
import {
  PRINTER_CONFIG_EVENT,
  STORAGE_KEY,
  type PrinterDevice,
  type PrinterWidth,
  type SavedPrinter,
} from "./services";
import {
  conectarImpressoraWeb,
  desconectarImpressoraWeb,
  enviarImpressoraWeb,
  listarImpressorasPareadasWeb,
  selecionarImpressoraWeb,
  webBluetoothConectado,
  webBluetoothSuportado,
} from "./web-bluetooth";
import { formatTicket, type TicketPayload } from "./ticket";

export type PrinterConfig = {
  printer: SavedPrinter | null;
  width: PrinterWidth;
  autoPrint: boolean;
};

export type PrinterSupport = {
  suportado: boolean;
  plataforma: "web" | "android" | "ios";
  classico: boolean;
  ble: boolean;
  mensagem: string;
};

const CONFIG_PADRAO: PrinterConfig = { printer: null, width: 80, autoPrint: false };

export function carregarConfigImpressora(): PrinterConfig {
  if (typeof window === "undefined") return CONFIG_PADRAO;
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return CONFIG_PADRAO;
    const dados = JSON.parse(bruto) as Partial<PrinterConfig> & { printer?: Partial<SavedPrinter> | null };
    const largura: PrinterWidth = Number(dados.width) === 58 ? 58 : 80;
    const autoPrint = dados.autoPrint === true;
    const printer = dados.printer;
    if (!printer || typeof printer.id !== "string" || typeof printer.name !== "string") {
      return { printer: null, width: largura, autoPrint };
    }
    return {
      width: Number(printer.width) === 58 ? 58 : largura,
      autoPrint,
      printer: {
        id: printer.id,
        name: printer.name,
        mode: printer.mode === "classic" ? "classic" : "ble",
        address: typeof printer.address === "string" ? printer.address : null,
        serviceUuid: typeof printer.serviceUuid === "string" ? printer.serviceUuid : null,
        characteristicUuid: typeof printer.characteristicUuid === "string" ? printer.characteristicUuid : null,
        width: Number(printer.width) === 58 ? 58 : 80,
      },
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

export function salvarConfigImpressora(config: PrinterConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(PRINTER_CONFIG_EVENT, { detail: config }));
  } catch {
    // A impressão continua funcionando mesmo se o navegador bloquear o armazenamento.
  }
}

export function atualizarConfigImpressora(patch: Partial<PrinterConfig>): PrinterConfig {
  const atual = carregarConfigImpressora();
  const width = patch.width ?? atual.width;
  const base = patch.printer !== undefined ? patch.printer : atual.printer;
  const novo: PrinterConfig = {
    width,
    autoPrint: patch.autoPrint ?? atual.autoPrint,
    printer: base ? { ...base, width } : null,
  };
  salvarConfigImpressora(novo);
  return novo;
}

export function limparConfigImpressora(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(PRINTER_CONFIG_EVENT, { detail: CONFIG_PADRAO }));
  } catch {
    // Ignora.
  }
}

export function suporteImpressao(): PrinterSupport {
  const plataforma = plataformaNativa();
  if (plataforma === "android") {
    return {
      suportado: true,
      plataforma,
      classico: true,
      ble: true,
      mensagem: "App Android: Bluetooth Clássico (ESC/POS) e BLE.",
    };
  }
  if (plataforma === "ios") {
    return {
      suportado: true,
      plataforma,
      classico: false,
      ble: true,
      mensagem: "App iOS: somente impressoras BLE. Bluetooth Clássico não é suportado pelo iOS.",
    };
  }
  if (webBluetoothSuportado()) {
    return {
      suportado: true,
      plataforma,
      classico: false,
      ble: true,
      mensagem: "Navegador: somente impressoras BLE. Use Chrome/Edge no Android ou no computador.",
    };
  }
  return {
    suportado: false,
    plataforma,
    classico: false,
    ble: false,
    mensagem:
      "Este navegador não suporta Bluetooth. Use Chrome/Edge no Android ou instale o app Android para impressoras Bluetooth Clássico.",
  };
}

export async function listarDispositivosImpressora(): Promise<PrinterDevice[]> {
  const plataforma = plataformaNativa();
  if (plataforma === "android") return listarImpressorasClassicas();
  if (plataforma === "ios") return [];
  return listarImpressorasPareadasWeb();
}

export async function selecionarDispositivoImpressora(
  modo: "ble" | "classic",
  width: PrinterWidth,
  device?: PrinterDevice,
): Promise<SavedPrinter> {
  const plataforma = plataformaNativa();
  if (modo === "classic") {
    if (plataforma !== "android" || !suportaClassicoNativo()) {
      throw new Error("Bluetooth Clássico está disponível apenas no app Android.");
    }
    if (!device?.address) throw new Error("Selecione uma impressora Bluetooth Clássico.");
    return conectarImpressoraClassica(device.address, width);
  }
  if (plataforma === "web") return selecionarImpressoraWeb();
  return selecionarImpressoraBleNativa(width);
}

export async function conectarImpressoraSalva(printer: SavedPrinter): Promise<SavedPrinter> {
  const plataforma = plataformaNativa();
  if (printer.mode === "classic") {
    if (plataforma !== "android") throw new Error("Bluetooth Clássico está disponível apenas no app Android.");
    if (!printer.address) throw new Error("Endereço da impressora Clássico ausente.");
    return conectarImpressoraClassica(printer.address, printer.width);
  }
  if (plataforma === "web") return conectarImpressoraWeb(printer);
  return conectarImpressoraBleNativa(printer);
}

export async function desconectarImpressora(printer: SavedPrinter | null): Promise<void> {
  const plataforma = plataformaNativa();
  if (printer?.mode === "classic" && plataforma === "android") {
    await desconectarImpressoraClassica();
    return;
  }
  if (plataforma === "web") {
    await desconectarImpressoraWeb();
    return;
  }
  await desconectarImpressoraBleNativa();
}

export async function impressoraConectada(printer: SavedPrinter | null): Promise<boolean> {
  const plataforma = plataformaNativa();
  if (printer?.mode === "classic" && plataforma === "android") return classicoNativoConectado();
  if (plataforma === "web") return webBluetoothConectado();
  return bleNativoConectado();
}

async function enviarBytes(printer: SavedPrinter, bytes: Uint8Array): Promise<void> {
  const plataforma = plataformaNativa();
  if (printer.mode === "classic" && plataforma === "android") {
    await enviarImpressoraClassica(bytes);
    return;
  }
  if (plataforma === "web") {
    await enviarImpressoraWeb(bytes);
    return;
  }
  await enviarImpressoraBleNativa(bytes);
}

export async function imprimirPayload(printer: SavedPrinter, payload: TicketPayload): Promise<void> {
  const texto = formatTicket(payload, printer.width);
  const bytes = buildTicketEscPos(texto);
  await enviarBytes(printer, bytes);
}

export async function imprimirTeste(printer: SavedPrinter, nomeEstabelecimento: string): Promise<void> {
  const texto = formatTicket(
    {
      teste: true,
      gerado_em: new Date().toISOString(),
      estabelecimento: { nome: nomeEstabelecimento || "BOM PA POXA" },
    },
    printer.width,
  );
  const bytes = buildTestEscPos(texto);
  await enviarBytes(printer, bytes);
}

export async function imprimirPedidoBluetooth(payload: TicketPayload): Promise<SavedPrinter> {
  const config = carregarConfigImpressora();
  if (!config.printer) {
    throw new Error("Nenhuma impressora Bluetooth configurada. Abra Admin > Impressora e conecte uma impressora.");
  }
  const printer = await conectarImpressoraSalva(config.printer);
  const comLargura = { ...printer, width: config.printer.width };
  await imprimirPayload(comLargura, payload);
  return comLargura;
}

export type { PrinterDevice, PrinterWidth, SavedPrinter };
export type { TicketPayload };

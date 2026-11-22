export type PrinterWidth = 58 | 80;
export type PrinterMode = "ble" | "classic";

export type SavedPrinter = {
  id: string;
  name: string;
  mode: PrinterMode;
  address?: string | null;
  serviceUuid?: string | null;
  characteristicUuid?: string | null;
  width: PrinterWidth;
};

export type PrinterDevice = {
  id: string;
  name: string;
  mode: PrinterMode;
  address?: string | null;
};

export const COMMON_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffb0-0000-1000-8000-00805f9b34fb",
  "0000ff30-0000-1000-8000-00805f9b34fb",
  "0000ff40-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000aabb-0000-1000-8000-00805f9b34fb",
] as const;

export const STORAGE_KEY = "bompapoxa.impressora.bluetooth.v1";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bytesParaBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binario);
}

export function mensagemBluetooth(erro: unknown, fallback: string): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro ?? "");
  if (/user cancelled|User cancelled|chooser|not found/i.test(mensagem)) return "Seleção cancelada.";
  if (/permission|notallowed|denied|autoriza/i.test(mensagem)) return "Permissão de Bluetooth negada. Autorize nas configurações do aparelho.";
  if (/powered off|turned off|bluetooth.*off|desativado/i.test(mensagem)) return "Ative o Bluetooth do aparelho.";
  if (/not supported|not available|undefined/i.test(mensagem)) return "Bluetooth não suportado neste navegador/aparelho.";
  if (/failed to connect|connection.*fail|conexão/i.test(mensagem)) return "Não foi possível conectar à impressora. Verifique se ela está ligada e pareada.";
  return mensagem.slice(0, 300) || fallback;
}

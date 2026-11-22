import {
  COMMON_PRINTER_SERVICES,
  delay,
  type PrinterDevice,
  type SavedPrinter,
} from "./services";

type WebConnection = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
};

let conexao: WebConnection | null = null;
let dispositivoPendente: BluetoothDevice | null = null;

function suportaWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator && Boolean(navigator.bluetooth);
}

function exigirSuporte() {
  if (!suportaWebBluetooth()) {
    throw new Error(
      "Este navegador não suporta Bluetooth. Use Chrome/Edge no Android ou no computador. No iPhone, use um aplicativo nativo.",
    );
  }
}

function nomeDispositivo(device: BluetoothDevice): string {
  return device.name?.trim() || "Impressora Bluetooth";
}

export function webBluetoothSuportado(): boolean {
  return suportaWebBluetooth();
}

export async function listarImpressorasPareadasWeb(): Promise<PrinterDevice[]> {
  if (!suportaWebBluetooth()) return [];
  const bluetooth = navigator.bluetooth;
  if (typeof bluetooth.getDevices !== "function") return [];
  try {
    const devices = await bluetooth.getDevices();
    return devices.map((device) => ({
      id: device.id,
      name: nomeDispositivo(device),
      mode: "ble" as const,
    }));
  } catch {
    return [];
  }
}

async function descobrirCaracteristica(server: BluetoothRemoteGATTServer): Promise<{
  serviceUuid: string;
  characteristic: BluetoothRemoteGATTCharacteristic;
}> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const characteristic of characteristics) {
      if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
        return { serviceUuid: service.uuid, characteristic };
      }
    }
  }
  throw new Error(
    "A impressora conectou, mas não expôs uma característica de escrita ESC/POS. Ela pode usar Bluetooth Clássico; nesse caso, use o app Android.",
  );
}

async function conectarDevice(device: BluetoothDevice): Promise<SavedPrinter> {
  if (!device.gatt) throw new Error("Este dispositivo não oferece conexão GATT.");
  const server = await device.gatt.connect();
  const { serviceUuid, characteristic } = await descobrirCaracteristica(server);
  conexao = { device, characteristic };
  return {
    id: device.id,
    name: nomeDispositivo(device),
    mode: "ble",
    serviceUuid,
    characteristicUuid: characteristic.uuid,
    width: 80,
  };
}

export async function selecionarImpressoraWeb(): Promise<SavedPrinter> {
  exigirSuporte();
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [...COMMON_PRINTER_SERVICES],
  });
  dispositivoPendente = device;
  return conectarDevice(device);
}

export async function conectarImpressoraWeb(saved: SavedPrinter): Promise<SavedPrinter> {
  exigirSuporte();
  let device: BluetoothDevice | null = null;
  if (dispositivoPendente?.id === saved.id) {
    device = dispositivoPendente;
  } else if (typeof navigator.bluetooth.getDevices === "function") {
    try {
      const devices = await navigator.bluetooth.getDevices();
      device = devices.find((item) => item.id === saved.id) ?? null;
    } catch {
      device = null;
    }
  }
  if (!device) {
    throw new Error("A impressora não está mais autorizada. Clique em Procurar e selecione novamente.");
  }
  const conectada = await conectarDevice(device);
  return {
    ...conectada,
    width: saved.width,
    serviceUuid: saved.serviceUuid ?? conectada.serviceUuid,
    characteristicUuid: saved.characteristicUuid ?? conectada.characteristicUuid,
  };
}

export async function enviarImpressoraWeb(bytes: Uint8Array): Promise<void> {
  if (!conexao) throw new Error("Impressora Bluetooth não conectada.");
  const { characteristic } = conexao;
  if (conexao.device.gatt && !conexao.device.gatt.connected) {
    throw new Error("A conexão Bluetooth caiu. Reconecte a impressora.");
  }
  const tamanho = 20;
  for (let offset = 0; offset < bytes.length; offset += tamanho) {
    const pedaco = bytes.slice(offset, offset + tamanho);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(pedaco);
    } else {
      await characteristic.writeValue(pedaco);
    }
    await delay(30);
  }
}

export async function desconectarImpressoraWeb(): Promise<void> {
  try {
    conexao?.device.gatt?.disconnect();
  } catch {
    // Ignora falha ao desconectar um dispositivo já desconectado.
  }
  conexao = null;
  dispositivoPendente = null;
}

export function webBluetoothConectado(): boolean {
  return Boolean(conexao?.device.gatt?.connected);
}

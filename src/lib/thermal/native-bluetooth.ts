import { Capacitor, registerPlugin } from "@capacitor/core";
import { BleClient, type BleDevice } from "@capacitor-community/bluetooth-le";
import {
  COMMON_PRINTER_SERVICES,
  bytesParaBase64,
  delay,
  type PrinterDevice,
  type SavedPrinter,
} from "./services";

type ClassicDevice = { address: string; name?: string | null };

type ThermalPrinterPlugin = {
  listDevices(): Promise<{ devices: ClassicDevice[] }>;
  connect(options: { address: string }): Promise<{ name?: string | null }>;
  write(options: { data: string }): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<{ connected: boolean }>;
};

const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>("ThermalPrinter");

let bleConnection: { deviceId: string; serviceUuid: string; characteristicUuid: string; writeWithoutResponse: boolean } | null = null;
let classicConectado = false;

export function plataformaNativa(): "web" | "android" | "ios" {
  const plataforma = Capacitor.getPlatform();
  if (plataforma === "android" || plataforma === "ios") return plataforma;
  return "web";
}

export function suportaClassicoNativo(): boolean {
  return Capacitor.getPlatform() === "android";
}

async function inicializarBle(): Promise<void> {
  await BleClient.initialize({ androidNeverForLocation: true });
  await BleClient.setDisplayStrings({
    scanning: "Procurando impressoras…",
    noDeviceFound: "Nenhuma impressora encontrada.",
    cancel: "Cancelar",
  });
}

function nomeBle(device: BleDevice): string {
  return device.name?.trim() || "Impressora BLE";
}

async function descobrirCaracteristicaBle(deviceId: string): Promise<{
  serviceUuid: string;
  characteristicUuid: string;
  writeWithoutResponse: boolean;
}> {
  const services = await BleClient.getServices(deviceId);
  for (const service of services) {
    for (const characteristic of service.characteristics) {
      if (characteristic.properties.writeWithoutResponse || characteristic.properties.write) {
        return {
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          writeWithoutResponse: characteristic.properties.writeWithoutResponse,
        };
      }
    }
  }
  throw new Error(
    "A impressora conectou, mas não expôs uma característica de escrita ESC/POS. Verifique se ela é compatível.",
  );
}

export async function listarImpressorasClassicas(): Promise<PrinterDevice[]> {
  if (!suportaClassicoNativo()) return [];
  const { devices } = await ThermalPrinter.listDevices();
  return devices
    .filter((device) => Boolean(device.address))
    .map((device) => ({
      id: device.address,
      name: device.name?.trim() || device.address,
      mode: "classic" as const,
      address: device.address,
    }));
}

export async function conectarImpressoraClassica(address: string, width: SavedPrinter["width"]): Promise<SavedPrinter> {
  const resultado = await ThermalPrinter.connect({ address });
  classicConectado = true;
  return {
    id: address,
    name: resultado.name?.trim() || address,
    mode: "classic",
    address,
    width,
  };
}

export async function enviarImpressoraClassica(bytes: Uint8Array): Promise<void> {
  if (!classicConectado) throw new Error("Impressora Bluetooth Clássico não conectada.");
  await ThermalPrinter.write({ data: bytesParaBase64(bytes) });
}

export async function desconectarImpressoraClassica(): Promise<void> {
  try {
    await ThermalPrinter.disconnect();
  } catch {
    // Ignora se já estava desconectado.
  }
  classicConectado = false;
}

export async function selecionarImpressoraBleNativa(width: SavedPrinter["width"]): Promise<SavedPrinter> {
  await inicializarBle();
  const device = await BleClient.requestDevice({
    services: [],
    optionalServices: [...COMMON_PRINTER_SERVICES],
    displayMode: "list",
  });
  await BleClient.connect(device.deviceId, () => {
    bleConnection = null;
  });
  const caracteristica = await descobrirCaracteristicaBle(device.deviceId);
  bleConnection = { deviceId: device.deviceId, ...caracteristica };
  return {
    id: device.deviceId,
    name: nomeBle(device),
    mode: "ble",
    serviceUuid: caracteristica.serviceUuid,
    characteristicUuid: caracteristica.characteristicUuid,
    width,
  };
}

export async function conectarImpressoraBleNativa(saved: SavedPrinter): Promise<SavedPrinter> {
  if (!saved.serviceUuid || !saved.characteristicUuid) {
    throw new Error("A impressora BLE não possui as características salvas. Procure novamente.");
  }
  await inicializarBle();
  await BleClient.connect(saved.id, () => {
    bleConnection = null;
  });
  bleConnection = {
    deviceId: saved.id,
    serviceUuid: saved.serviceUuid,
    characteristicUuid: saved.characteristicUuid,
    writeWithoutResponse: true,
  };
  return saved;
}

export async function enviarImpressoraBleNativa(bytes: Uint8Array): Promise<void> {
  if (!bleConnection) throw new Error("Impressora BLE não conectada.");
  const { deviceId, serviceUuid, characteristicUuid } = bleConnection;
  const tamanho = 20;
  for (let offset = 0; offset < bytes.length; offset += tamanho) {
    const pedaco = bytes.slice(offset, offset + tamanho);
    const view = new DataView(pedaco.buffer, pedaco.byteOffset, pedaco.byteLength);
    if (bleConnection.writeWithoutResponse) {
      await BleClient.writeWithoutResponse(deviceId, serviceUuid, characteristicUuid, view);
    } else {
      await BleClient.write(deviceId, serviceUuid, characteristicUuid, view);
    }
    await delay(30);
  }
}

export async function desconectarImpressoraBleNativa(): Promise<void> {
  if (bleConnection) {
    try {
      await BleClient.disconnect(bleConnection.deviceId);
    } catch {
      // Ignora se já estava desconectado.
    }
  }
  bleConnection = null;
}

export async function bleNativoConectado(): Promise<boolean> {
  return Boolean(bleConnection);
}

export async function classicoNativoConectado(): Promise<boolean> {
  return classicConectado;
}

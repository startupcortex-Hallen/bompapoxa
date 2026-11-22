import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bompapoxa.app",
  appName: "BOM PA POXA",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Procurando impressoras…",
        cancel: "Cancelar",
        availableDevices: "Impressoras disponíveis",
        noDeviceFound: "Nenhuma impressora encontrada.",
      },
    },
  },
};

export default config;

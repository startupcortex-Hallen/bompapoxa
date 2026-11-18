import pkg from "node-thermal-printer";

const { ThermalPrinter, PrinterTypes, CharacterSet } = pkg;

function criarImpressora(config) {
  const tipo = String(config.printerType ?? "epson").toLowerCase() === "star" ? PrinterTypes.STAR : PrinterTypes.EPSON;
  return new ThermalPrinter({
    type: tipo,
    interface: config.printerInterface,
    characterSet: CharacterSet.PC860_PORTUGUESE ?? CharacterSet.PC850,
    width: Number(config.printerWidthMm) === 58 ? 32 : 48,
    removeSpecialCharacters: false,
    lineCharacter: "-",
  });
}

export async function verificarConexao(config) {
  const impressora = criarImpressora(config);
  if (typeof impressora.isPrinterConnected !== "function") return true;
  try {
    return await impressora.isPrinterConnected();
  } catch {
    return false;
  }
}

export async function enviarParaImpressora(texto, config) {
  const impressora = criarImpressora(config);
  if (typeof impressora.isPrinterConnected === "function") {
    const conectada = await impressora.isPrinterConnected();
    if (!conectada) throw new Error("Impressora desconectada ou desligada.");
  }
  for (const linha of String(texto).replace(/\r\n/g, "\n").split("\n")) {
    impressora.println(linha);
  }
  impressora.cut();
  if (typeof impressora.execute === "function") await impressora.execute();
  else if (typeof impressora.print === "function") await impressora.print();
  else throw new Error("Biblioteca de impressão sem método de execução.");
}

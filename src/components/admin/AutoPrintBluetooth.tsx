import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminConfiguracoesQuery, adminPedidosQuery } from "@/lib/queries";
import { pedidoElegivelParaImpressao, selecionarPedidosNovos } from "@/lib/thermal/auto-print";
import { montarPayloadImpressao } from "@/lib/thermal/order-payload";
import {
  carregarConfigImpressora,
  imprimirPedidoBluetooth,
  type PrinterConfig,
} from "@/lib/thermal/printer";
import { PRINTER_CONFIG_EVENT, mensagemBluetooth } from "@/lib/thermal/services";
import type { Pedido } from "@/lib/types";

export function AutoPrintBluetooth() {
  const { data: pedidos } = useQuery(adminPedidosQuery);
  const { data: layout } = useQuery(adminConfiguracoesQuery);
  const [config, setConfig] = useState<PrinterConfig>(() => carregarConfigImpressora());
  const vistos = useRef<Set<string> | null>(null);
  const fila = useRef<Pedido[]>([]);
  const processando = useRef(false);
  const layoutRef = useRef(layout);

  layoutRef.current = layout;

  useEffect(() => {
    const atualizar = () => setConfig(carregarConfigImpressora());
    window.addEventListener(PRINTER_CONFIG_EVENT, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(PRINTER_CONFIG_EVENT, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const processar = useCallback(async () => {
    if (processando.current) return;
    processando.current = true;
    try {
      while (fila.current.length) {
        const pedido = fila.current.shift();
        if (!pedido) continue;
        const atual = carregarConfigImpressora();
        if (!atual.autoPrint || !atual.printer) continue;
        try {
          await imprimirPedidoBluetooth(montarPayloadImpressao(pedido, layoutRef.current?.configuracoes));
          toast.success(`Pedido #${pedido.numero} impresso no Bluetooth.`);
        } catch (erro) {
          toast.error(mensagemBluetooth(erro, `Não foi possível imprimir o pedido #${pedido.numero}.`));
        }
      }
    } finally {
      processando.current = false;
    }
  }, []);

  useEffect(() => {
    if (!pedidos) return;
    if (!vistos.current) {
      vistos.current = new Set(pedidos.map((pedido) => pedido.id));
      return;
    }
    const novos = selecionarPedidosNovos(pedidos, vistos.current);
    for (const pedido of pedidos) {
      if (pedidoElegivelParaImpressao(pedido)) vistos.current.add(pedido.id);
    }
    if (!novos.length || !config.autoPrint || !config.printer) return;
    fila.current.push(...novos);
    void processar();
  }, [pedidos, config.autoPrint, config.printer, processar]);

  return null;
}

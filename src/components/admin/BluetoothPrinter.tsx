import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bluetooth,
  BluetoothConnected,
  CheckCircle2,
  Printer,
  RefreshCw,
  Search,
  Smartphone,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSection } from "@/components/admin/ui";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/form";
import { adminConfiguracoesQuery } from "@/lib/queries";
import {
  carregarConfigImpressora,
  conectarImpressoraSalva,
  desconectarImpressora,
  imprimirTeste,
  limparConfigImpressora,
  listarDispositivosImpressora,
  salvarConfigImpressora,
  selecionarDispositivoImpressora,
  suporteImpressao,
  type PrinterConfig,
  type PrinterDevice,
  type SavedPrinter,
} from "@/lib/thermal/printer";
import { mensagemBluetooth } from "@/lib/thermal/services";

const MODO_LABEL: Record<SavedPrinter["mode"], string> = {
  ble: "BLE",
  classic: "Bluetooth Clássico",
};

export function BluetoothPrinter() {
  const configQuery = useQuery(adminConfiguracoesQuery);
  const [config, setConfig] = useState<PrinterConfig>(() => carregarConfigImpressora());
  const [suporte] = useState(() => suporteImpressao());
  const [dispositivos, setDispositivos] = useState<PrinterDevice[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [conectando, setConectando] = useState<string | null>(null);
  const [conectada, setConectada] = useState(false);
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const nomeEstabelecimento = configQuery.data?.configuracoes.nome_estabelecimento ?? "BOM PA POXA";

  useEffect(() => {
    const salva = config.printer;
    if (!salva || !suporte.suportado) return;
    let cancelado = false;
    setConectando("auto");
    conectarImpressoraSalva({ ...salva, width: config.width })
      .then((printer) => {
        if (cancelado) return;
        setConectada(true);
        setConfig((atual) => ({ ...atual, printer: { ...printer, width: atual.width } }));
      })
      .catch(() => {
        // A reconexão automática é opcional; o usuário pode conectar manualmente.
      })
      .finally(() => {
        if (!cancelado) setConectando(null);
      });
    return () => {
      cancelado = true;
    };
    // Executa apenas na montagem para aproveitar a impressora já autorizada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistir = (
    printer: SavedPrinter | null,
    largura: PrinterConfig["width"],
    autoPrint = config.autoPrint,
  ) => {
    const novo: PrinterConfig = {
      width: largura,
      autoPrint,
      printer: printer ? { ...printer, width: largura } : null,
    };
    setConfig(novo);
    salvarConfigImpressora(novo);
    return novo;
  };

  const mudarLargura = (largura: PrinterConfig["width"]) => {
    persistir(config.printer, largura);
    setAviso(`Papel configurado para ${largura} mm.`);
  };

  const mudarImpressaoAutomatica = (ativo: boolean) => {
    if (ativo && !config.printer) {
      setErro("Conecte uma impressora antes de ativar a impressão automática.");
      return;
    }
    setErro(null);
    persistir(config.printer, config.width, ativo);
    setAviso(
      ativo
        ? "Impressão automática ativada. Novos pedidos serão impressos enquanto o painel estiver aberto."
        : "Impressão automática desativada.",
    );
  };

  const procurar = async () => {
    setBuscando(true);
    setErro(null);
    setAviso(null);
    try {
      const lista = await listarDispositivosImpressora();
      setDispositivos(lista);
      if (!lista.length) {
        setAviso(
          suporte.plataforma === "web"
            ? "Nenhuma impressora autorizada neste navegador. Use “Procurar nova impressora BLE”."
            : "Nenhuma impressora Clássico encontrada. Verifique se ela está ligada e pareada no Bluetooth do aparelho.",
        );
      } else {
        setAviso(`${lista.length} impressora(s) encontrada(s).`);
      }
    } catch (falha) {
      setErro(mensagemBluetooth(falha, "Não foi possível procurar impressoras."));
    } finally {
      setBuscando(false);
    }
  };

  const conectar = async (device: PrinterDevice) => {
    setConectando(device.id);
    setErro(null);
    try {
      const printer = await selecionarDispositivoImpressora(device.mode, config.width, device);
      persistir(printer, config.width);
      setConectada(true);
      setAviso(`Conectada a ${printer.name}.`);
      toast.success(`Impressora ${printer.name} conectada.`);
    } catch (falha) {
      setConectada(false);
      setErro(mensagemBluetooth(falha, "Não foi possível conectar à impressora."));
    } finally {
      setConectando(null);
    }
  };

  const procurarBle = async () => {
    setConectando("ble");
    setErro(null);
    setAviso(null);
    try {
      const printer = await selecionarDispositivoImpressora("ble", config.width);
      persistir(printer, config.width);
      setConectada(true);
      setAviso(`Conectada a ${printer.name}.`);
      toast.success(`Impressora ${printer.name} conectada.`);
    } catch (falha) {
      setConectada(false);
      setErro(mensagemBluetooth(falha, "Não foi possível conectar à impressora BLE."));
    } finally {
      setConectando(null);
    }
  };

  const reconectar = async () => {
    if (!config.printer) return;
    setConectando("salva");
    setErro(null);
    try {
      const printer = await conectarImpressoraSalva({ ...config.printer, width: config.width });
      persistir(printer, config.width);
      setConectada(true);
      setAviso(`Reconectada a ${printer.name}.`);
      toast.success("Impressora reconectada.");
    } catch (falha) {
      setConectada(false);
      setErro(mensagemBluetooth(falha, "Não foi possível reconectar. Procure a impressora novamente."));
    } finally {
      setConectando(null);
    }
  };

  const desconectar = async () => {
    setErro(null);
    await desconectarImpressora(config.printer);
    setConectada(false);
    setAviso("Impressora desconectada. Ela permanece salva para reconectar depois.");
  };

  const remover = async () => {
    if (!window.confirm("Remover a impressora salva deste aparelho?")) return;
    await desconectarImpressora(config.printer);
    limparConfigImpressora();
    setConectada(false);
    setConfig(carregarConfigImpressora());
    setDispositivos([]);
    setAviso("Impressora removida. Procure e conecte outra.");
  };

  const testar = async () => {
    const salva = config.printer;
    if (!salva) {
      setErro("Conecte uma impressora antes de testar.");
      return;
    }
    setTestando(true);
    setErro(null);
    try {
      let printer = { ...salva, width: config.width };
      if (!conectada) {
        printer = await conectarImpressoraSalva(printer);
        setConectada(true);
      }
      await imprimirTeste({ ...printer, width: config.width }, nomeEstabelecimento);
      setAviso("Teste enviado para a impressora.");
      toast.success("Teste de impressão enviado.");
    } catch (falha) {
      setErro(mensagemBluetooth(falha, "Falha ao imprimir o teste."));
    } finally {
      setTestando(false);
    }
  };

  const ocupado = buscando || Boolean(conectando) || testando;

  return (
    <AdminSection
      titulo="Impressora Bluetooth"
      descricao="Conecte a impressora térmica do celular/tablet e imprima os pedidos direto pelo app."
      acao={
        <Badge cor={suporte.suportado ? "success" : "danger"}>
          {suporte.suportado ? (suporte.classico ? "Clássico + BLE" : "BLE") : "Sem suporte"}
        </Badge>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs text-muted-foreground">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{suporte.mensagem}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Tamanho do papel"
            value={String(config.width)}
            onChange={(event) => mudarLargura(Number(event.target.value) === 58 ? 58 : 80)}
            hint="A formatação do cupom se adapta a 32 ou 48 colunas."
          >
            <option value="58">58 mm (pequena)</option>
            <option value="80">80 mm (grande)</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={() => void procurar()} disabled={!suporte.suportado || ocupado}>
              <Search className="h-4 w-4" /> {buscando ? "Procurando…" : "Procurar impressoras"}
            </Button>
            {suporte.ble ? (
              <Button type="button" onClick={() => void procurarBle()} disabled={ocupado}>
                <Bluetooth className="h-4 w-4" /> {conectando === "ble" ? "Conectando…" : "Adicionar BLE"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/20 px-3.5 py-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.autoPrint}
              onChange={mudarImpressaoAutomatica}
              label="Impressão automática de novos pedidos"
              disabled={!config.printer}
            />
            Imprimir automaticamente os novos pedidos
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Funciona com o painel aberto neste aparelho. Não use junto com o agente local para evitar cupons duplicados.
          </p>
        </div>

        {erro ? (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{erro}</p>
          </div>
        ) : null}
        {aviso ? (
          <div className="flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-3.5 py-3 text-xs text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{aviso}</p>
          </div>
        ) : null}

        {config.printer ? (
          <div className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={conectada ? "text-success" : "text-muted-foreground"}>
                  {conectada ? <BluetoothConnected className="h-6 w-6" /> : <Unplug className="h-6 w-6" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{config.printer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {MODO_LABEL[config.printer.mode]} • {config.width} mm • {conectada ? "conectada" : "salva"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!conectada ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void reconectar()} disabled={ocupado}>
                    <RefreshCw className={conectando === "salva" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Reconectar
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => void desconectar()} disabled={ocupado}>
                    <Unplug className="h-3.5 w-3.5" /> Desconectar
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => void testar()} disabled={ocupado}>
                  <Printer className="h-3.5 w-3.5" /> {testando ? "Imprimindo…" : "Testar impressão"}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => void remover()} disabled={ocupado}>
                  Remover
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {dispositivos.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Impressoras encontradas</p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {dispositivos.map((device) => (
                <li key={`${device.mode}-${device.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{device.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {MODO_LABEL[device.mode]}
                      {device.address ? ` • ${device.address}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void conectar(device)}
                    disabled={ocupado}
                  >
                    {conectando === device.id ? "Conectando…" : "Conectar"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-border/70 bg-secondary/20 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Compatibilidade</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Android no app: impressoras Bluetooth Clássico (SPP) e BLE com ESC/POS.</li>
            <li>Navegador Chrome/Edge: somente BLE. O iPhone/Safari não expõe Bluetooth para sites.</li>
            <li>A impressora precisa aceitar comandos ESC/POS. O pareamento deve ser feito também nas configurações de Bluetooth do aparelho.</li>
          </ul>
        </div>
      </div>
    </AdminSection>
  );
}

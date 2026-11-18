import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Copy,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  atualizarImpressora,
  cancelarImpressao,
  criarImpressora,
  enfileirarReimpressao,
  enfileirarTesteImpressao,
  regenerarTokenImpressora,
  reprocessarImpressao,
} from "@/lib/api";
import { impressoraOnline, STATUS_IMPRESSAO_LABEL } from "@/lib/payment-status";
import { adminFilaImpressaoQuery, adminImpressorasQuery, chaves } from "@/lib/queries";
import { dataHoraBR } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { StatusImpressao, TrabalhoImpressao } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/impressao")({
  component: ImpressaoPage,
});

type Filtro = "todas" | StatusImpressao;

type TokenGerado = { nome: string; token: string };

const CORES_STATUS: Record<StatusImpressao, "success" | "danger" | "accent" | "primary" | "neutral"> = {
  pendente: "accent",
  processando: "primary",
  impresso: "success",
  erro: "danger",
  cancelado: "neutral",
};

function ImpressaoPage() {
  useTitulo("Impressão");
  const qc = useQueryClient();
  const impressoras = useQuery(adminImpressorasQuery);
  const fila = useQuery(adminFilaImpressaoQuery);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [nome, setNome] = useState("");
  const [largura, setLargura] = useState<"58" | "80">("80");
  const [setor, setSetor] = useState("principal");
  const [criando, setCriando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<TokenGerado | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const jobs = useMemo(
    () => (fila.data ?? []).filter((job) => filtro === "todas" || job.status === filtro),
    [fila.data, filtro],
  );

  const contagem = useMemo(() => {
    const lista = fila.data ?? [];
    return {
      pendente: lista.filter((job) => job.status === "pendente").length,
      processando: lista.filter((job) => job.status === "processando").length,
      erro: lista.filter((job) => job.status === "erro").length,
      impresso: lista.filter((job) => job.status === "impresso").length,
      cancelado: lista.filter((job) => job.status === "cancelado").length,
      todas: lista.length,
    };
  }, [fila.data]);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminImpressoras }),
      qc.invalidateQueries({ queryKey: chaves.adminFilaImpressao }),
    ]);
  };

  const criar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome da impressora.");
      return;
    }
    setCriando(true);
    try {
      const resultado = await criarImpressora({
        nome,
        largura_mm: Number(largura) as 58 | 80,
        setor,
      });
      setTokenGerado({ nome: resultado.nome, token: resultado.token });
      setNome("");
      await invalidar();
      toast.success("Impressora cadastrada. Copie o token agora; ele não será exibido novamente.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar a impressora.");
    } finally {
      setCriando(false);
    }
  };

  const testar = async (impressoraId: string) => {
    setAcaoId(`teste-${impressoraId}`);
    try {
      await enfileirarTesteImpressao(impressoraId);
      toast.success("Teste enviado para a fila. O agente imprimirá quando estiver online.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível enfileirar o teste.");
    } finally {
      setAcaoId(null);
    }
  };

  const regenerar = async (impressoraId: string) => {
    if (!window.confirm("Gerar um novo token? O agente atual perderá o acesso até ser reconfigurado.")) return;
    setAcaoId(`token-${impressoraId}`);
    try {
      const token = await regenerarTokenImpressora(impressoraId);
      const impressora = (impressoras.data ?? []).find((item) => item.id === impressoraId);
      setTokenGerado({ nome: impressora?.nome ?? "Impressora", token });
      await invalidar();
      toast.success("Token regenerado. Atualize o arquivo do agente.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível regenerar o token.");
    } finally {
      setAcaoId(null);
    }
  };

  const alternarAtivo = async (id: string, ativo: boolean) => {
    setAcaoId(`ativo-${id}`);
    try {
      await atualizarImpressora(id, { ativo });
      await invalidar();
      toast.success(ativo ? "Impressora ativada." : "Impressora desativada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar a impressora.");
    } finally {
      setAcaoId(null);
    }
  };

  const reprocessar = async (job: TrabalhoImpressao) => {
    setAcaoId(job.id);
    try {
      await reprocessarImpressao(job.id);
      toast.success("Trabalho devolvido para a fila.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível reprocessar.");
    } finally {
      setAcaoId(null);
    }
  };

  const cancelar = async (job: TrabalhoImpressao) => {
    if (!window.confirm(`Cancelar o trabalho ${job.job_key}?`)) return;
    setAcaoId(job.id);
    try {
      await cancelarImpressao(job.id);
      toast.success("Trabalho cancelado.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível cancelar.");
    } finally {
      setAcaoId(null);
    }
  };

  const reimprimir = async (job: TrabalhoImpressao) => {
    if (!job.pedido_id) return;
    setAcaoId(job.id);
    try {
      await enfileirarReimpressao(job.pedido_id);
      toast.success("Reimpressão enfileirada.");
      await invalidar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível reimprimir.");
    } finally {
      setAcaoId(null);
    }
  };

  const copiarToken = async () => {
    if (!tokenGerado) return;
    try {
      await navigator.clipboard.writeText(tokenGerado.token);
      toast.success("Token copiado.");
    } catch {
      toast.error("Não foi possível copiar o token.");
    }
  };

  if (impressoras.isError && fila.isError) {
    return (
      <EstadoErro
        mensagem="A migration de impressão ainda não foi aplicada no Supabase. Execute a nova migration antes de usar esta tela."
        aoTentarNovamente={() => {
          void impressoras.refetch();
          void fila.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Impressão"
        descricao="Fila persistente ESC/POS, agente local no Windows, reimpressão registrada e histórico de erros."
        acao={
          <Button variant="outline" onClick={() => void invalidar()} disabled={fila.isFetching || impressoras.isFetching}>
            <RefreshCw className={cn("h-4 w-4", (fila.isFetching || impressoras.isFetching) && "animate-spin")} /> Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Contador rotulo="Pendentes" valor={contagem.pendente} />
        <Contador rotulo="Processando" valor={contagem.processando} />
        <Contador rotulo="Impressos" valor={contagem.impresso} />
        <Contador rotulo="Com erro" valor={contagem.erro} alerta={contagem.erro > 0} />
        <Contador rotulo="Cancelados" valor={contagem.cancelado} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <AdminSection
          titulo="Impressoras"
          descricao="Cadastre a impressora e configure o agente local com o token gerado."
        >
          {impressoras.isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : impressoras.data?.length ? (
            <div className="space-y-3">
              {impressoras.data.map((impressora) => {
                const online = impressoraOnline(impressora.ultimo_ping_em);
                const interfacePrinter = String(impressora.ultimo_info?.printerInterface ?? impressora.ultimo_info?.interface ?? "—");
                return (
                  <article key={impressora.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 font-medium">
                          <Printer className="h-4 w-4" /> {impressora.nome}
                          <Badge cor={online ? "success" : "neutral"}>
                            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {online ? "Online" : "Offline"}
                          </Badge>
                          {!impressora.ativo ? <Badge cor="danger">Inativa</Badge> : null}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {impressora.largura_mm} mm • setor {impressora.setor} • {interfacePrinter}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Último contato: {impressora.ultimo_ping_em ? dataHoraBR(impressora.ultimo_ping_em) : "nunca"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Ativa
                          <Switch
                            checked={impressora.ativo}
                            onChange={(ativo) => void alternarAtivo(impressora.id, ativo)}
                            label={`Ativar ${impressora.nome}`}
                            disabled={acaoId !== null}
                          />
                        </label>
                        <Button variant="outline" size="sm" carregando={acaoId === `teste-${impressora.id}`} onClick={() => void testar(impressora.id)}>
                          <Send className="h-3.5 w-3.5" /> Testar
                        </Button>
                        <Button variant="ghost" size="sm" carregando={acaoId === `token-${impressora.id}`} onClick={() => void regenerar(impressora.id)}>
                          Novo token
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EstadoVazio
              titulo="Nenhuma impressora cadastrada"
              descricao="Cadastre a impressora abaixo e configure o agente no computador da loja."
              icone={<Printer className="h-6 w-6" />}
            />
          )}

          <form onSubmit={criar} className="mt-5 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium">Cadastrar impressora</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px_140px_auto] sm:items-end">
              <Input label="Nome" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Cozinha" />
              <Select label="Papel" value={largura} onChange={(event) => setLargura(event.target.value as "58" | "80")}>
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </Select>
              <Input label="Setor" value={setor} onChange={(event) => setSetor(event.target.value)} placeholder="principal" />
              <Button type="submit" carregando={criando}>
                <Printer className="h-4 w-4" /> Criar
              </Button>
            </div>
          </form>
        </AdminSection>

        <AdminSection titulo="Agente local" descricao="A impressão automática não depende do painel aberto.">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Cadastre a impressora e copie o token exibido uma única vez.</li>
            <li>No Windows, instale o driver da impressora e conecte via USB ou rede.</li>
            <li>Copie <code className="text-[11px]">print-agent/config.example.json</code> para <code className="text-[11px]">agent.config.json</code>.</li>
            <li>Preencha a URL do Supabase, a chave anon pública, o token e a interface da impressora.</li>
            <li>Execute <code className="text-[11px]">npm install</code> e <code className="text-[11px]">npm start</code> na pasta <code className="text-[11px]">print-agent</code>.</li>
            <li>Use <code className="text-[11px]">install-windows.ps1</code> para iniciar no logon.</li>
          </ol>
          <div className="mt-4 rounded-xl border border-accent/35 bg-accent/10 p-3 text-xs text-muted-foreground">
            Se a impressora estiver desligada, os trabalhos ficam pendentes. Ao reconectar, o agente retira a fila
            automaticamente. Uma falha durante o envio fica registrada como erro e pode ser reprocessada.
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Guia completo: <span className="font-mono">docs/impressao.md</span></p>
        </AdminSection>
      </div>

      <AdminSection
        titulo="Fila de impressão"
        descricao="Atualização a cada 10 segundos. Reimpressões são registradas com o administrador solicitante."
      >
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {([
            ["todas", `Todas (${contagem.todas})`],
            ["pendente", `Pendentes (${contagem.pendente})`],
            ["processando", `Processando (${contagem.processando})`],
            ["impresso", `Impressos (${contagem.impresso})`],
            ["erro", `Erros (${contagem.erro})`],
            ["cancelado", `Cancelados (${contagem.cancelado})`],
          ] as const).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
                filtro === valor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {fila.isLoading ? (
          <div className="mt-4 space-y-2">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-24 rounded-xl" />)}</div>
        ) : fila.isError ? (
          <p className="mt-4 text-sm text-danger">Não foi possível carregar a fila.</p>
        ) : jobs.length ? (
          <div className="mt-4 space-y-2">
            {jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {job.tipo === "teste" ? "Teste de impressão" : `Pedido #${job.pedido_numero ?? "—"}`}
                      </p>
                      <Badge cor={CORES_STATUS[job.status]}>{STATUS_IMPRESSAO_LABEL[job.status]}</Badge>
                      {job.reimpressao ? <Badge cor="accent">Reimpressão</Badge> : null}
                      {job.largura_mm ? <Badge>{job.largura_mm} mm</Badge> : null}
                    </div>
                    <p className="mt-1 break-all text-[11px] text-muted-foreground">{job.job_key}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criado {dataHoraBR(job.created_at)} • tentativas {job.tentativas}
                      {job.impressora_nome ? ` • ${job.impressora_nome}` : ""}
                      {job.completed_at ? ` • concluído ${dataHoraBR(job.completed_at)}` : ""}
                    </p>
                    {job.erro ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger/10 px-2.5 py-2 text-xs text-danger">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {job.erro}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.status === "erro" || job.status === "cancelado" ? (
                      <Button variant="outline" size="sm" carregando={acaoId === job.id} onClick={() => void reprocessar(job)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reprocessar
                      </Button>
                    ) : null}
                    {job.pedido_id ? (
                      <Button variant="outline" size="sm" carregando={acaoId === job.id} onClick={() => void reimprimir(job)}>
                        <Printer className="h-3.5 w-3.5" /> Reimprimir
                      </Button>
                    ) : null}
                    {["pendente", "processando", "erro"].includes(job.status) ? (
                      <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" carregando={acaoId === job.id} onClick={() => void cancelar(job)}>
                        <Ban className="h-3.5 w-3.5" /> Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EstadoVazio
            className="mt-4"
            titulo="Nenhum trabalho neste filtro"
            descricao="Os pedidos entram na fila automaticamente quando são criados com sucesso."
            icone={<CheckCircle2 className="h-6 w-6" />}
          />
        )}
      </AdminSection>

      <Modal aberto={Boolean(tokenGerado)} aoFechar={() => setTokenGerado(null)} titulo="Token da impressora" descricao="Copie agora. Por segurança, ele não será exibido novamente.">
        <div className="space-y-4">
          <p className="text-sm">
            Impressora: <strong>{tokenGerado?.nome}</strong>
          </p>
          <pre className="overflow-x-auto rounded-xl bg-secondary/50 p-3 text-xs">{tokenGerado?.token}</pre>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void copiarToken()}>
              <Copy className="h-4 w-4" /> Copiar token
            </Button>
            <Button onClick={() => setTokenGerado(null)}>Já copiei</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Contador({ rotulo, valor, alerta }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", alerta && "border-danger/40 bg-danger/5")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{rotulo}</p>
      <p className={cn("mt-1 text-2xl font-semibold", alerta && "text-danger")}>{valor}</p>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, BotaoExcluir } from "@/components/admin/ui";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { adminCuponsQuery, chaves } from "@/lib/queries";
import { excluirCupom, salvarCupom } from "@/lib/api";
import { dataBR, moedaBRL, numero } from "@/lib/format";
import { useTitulo } from "@/lib/page-title";
import type { Cupom } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  component: CuponsPage,
});

function statusCupom(cupom: Cupom): { texto: string; cor: "success" | "danger" | "neutral" | "primary" } {
  const agora = Date.now();
  if (!cupom.ativo) return { texto: "Inativo", cor: "neutral" };
  if (cupom.valido_de && new Date(cupom.valido_de).getTime() > agora) return { texto: "Agendado", cor: "primary" };
  if (cupom.valido_ate && new Date(cupom.valido_ate).getTime() < agora) return { texto: "Expirado", cor: "danger" };
  if (cupom.usos_maximos !== null && cupom.usos >= cupom.usos_maximos) return { texto: "Esgotado", cor: "danger" };
  return { texto: "Ativo", cor: "success" };
}

function CuponsPage() {
  useTitulo("Cupons");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminCuponsQuery);
  const [editando, setEditando] = useState<Cupom | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chaves.adminCupons }),
      qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      qc.invalidateQueries({ queryKey: chaves.cardapio }),
    ]);
  };

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os cupons."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titulo="Cupons"
        descricao="Crie descontos por porcentagem ou valor fixo. O desconto é validado no servidor ao finalizar o pedido."
        acao={<Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo cupom</Button>}
      />

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-24 rounded-2xl" />)}</div>
      ) : data?.length ? (
        <div className="space-y-2">
          {data.map((cupom) => {
            const status = statusCupom(cupom);
            return (
              <div key={cupom.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><TicketPercent className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold tracking-wide">{cupom.codigo}</p>
                    <Badge cor={status.cor}>{status.texto}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cupom.tipo === "percentual" ? `${cupom.valor}% de desconto` : `${moedaBRL(cupom.valor)} de desconto`}
                    {cupom.pedido_minimo > 0 ? ` • mínimo ${moedaBRL(cupom.pedido_minimo)}` : ""}
                    {cupom.desconto_maximo ? ` • máx. ${moedaBRL(cupom.desconto_maximo)}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Usos: {cupom.usos}{cupom.usos_maximos ? ` / ${cupom.usos_maximos}` : ""}
                    {cupom.valido_ate ? ` • até ${dataBR(cupom.valido_ate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setEditando(cupom); setModalAberto(true); }} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Editar ${cupom.codigo}`}><Pencil className="h-4 w-4" /></button>
                  <BotaoExcluir
                    rotulo={`o cupom ${cupom.codigo}`}
                    aoConfirmar={() => {
                      void (async () => {
                        try {
                          await excluirCupom(cupom.id);
                          toast.success("Cupom excluído.");
                          await invalidar();
                        } catch (erro) {
                          toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
                        }
                      })();
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EstadoVazio
          titulo="Nenhum cupom cadastrado"
          descricao="Cupons ajudam a divulgar promoções e trazer clientes de volta."
          icone={<TicketPercent className="h-6 w-6" />}
          acao={<Button onClick={() => { setEditando(null); setModalAberto(true); }}><Plus className="h-4 w-4" /> Novo cupom</Button>}
        />
      )}

      <Modal aberto={modalAberto} aoFechar={() => setModalAberto(false)} titulo={editando ? "Editar cupom" : "Novo cupom"}>
        <CupomForm key={editando?.id ?? "novo"} cupom={editando} aoSalvar={async () => { setModalAberto(false); await invalidar(); }} aoCancelar={() => setModalAberto(false)} />
      </Modal>
    </div>
  );
}

function paraInputData(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CupomForm({ cupom, aoSalvar, aoCancelar }: { cupom: Cupom | null; aoSalvar: () => Promise<void>; aoCancelar: () => void }) {
  const [codigo, setCodigo] = useState(cupom?.codigo ?? "");
  const [tipo, setTipo] = useState(cupom?.tipo ?? "percentual");
  const [valor, setValor] = useState(cupom ? String(cupom.valor).replace(".", ",") : "");
  const [pedidoMinimo, setPedidoMinimo] = useState(cupom ? String(cupom.pedido_minimo).replace(".", ",") : "0");
  const [descontoMaximo, setDescontoMaximo] = useState(cupom?.desconto_maximo != null ? String(cupom.desconto_maximo).replace(".", ",") : "");
  const [usosMaximos, setUsosMaximos] = useState(cupom?.usos_maximos != null ? String(cupom.usos_maximos) : "");
  const [validoDe, setValidoDe] = useState(paraInputData(cupom?.valido_de ?? null));
  const [validoAte, setValidoAte] = useState(paraInputData(cupom?.valido_ate ?? null));
  const [ativo, setAtivo] = useState(cupom?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!codigo.trim()) return setErro("Informe o código do cupom.");
    const valorNum = numero(valor);
    if (!valorNum || valorNum <= 0) return setErro("Informe um valor de desconto.");
    if (tipo === "percentual" && valorNum > 100) return setErro("O percentual não pode passar de 100%.");
    if (validoDe && validoAte && new Date(validoAte) <= new Date(validoDe)) return setErro("A data final deve ser posterior à inicial.");
    setSalvando(true);
    try {
      await salvarCupom({
        ...(cupom?.id ? { id: cupom.id } : {}),
        codigo,
        tipo,
        valor: valorNum,
        pedido_minimo: numero(pedidoMinimo),
        desconto_maximo: descontoMaximo.trim() ? numero(descontoMaximo) : null,
        usos_maximos: usosMaximos.trim() ? Number(usosMaximos) : null,
        valido_de: validoDe ? new Date(validoDe).toISOString() : null,
        valido_ate: validoAte ? new Date(validoAte).toISOString() : null,
        ativo,
      });
      toast.success(cupom ? "Cupom atualizado." : "Cupom criado.");
      await aoSalvar();
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Código" obrigatorio value={codigo} onChange={(event) => setCodigo(event.target.value.toUpperCase())} placeholder="Ex.: BEMVINDO10" maxLength={40} />
        <Select label="Tipo de desconto" value={tipo} onChange={(event) => setTipo(event.target.value as Cupom["tipo"])}>
          <option value="percentual">Percentual (%)</option>
          <option value="valor_fixo">Valor fixo (R$)</option>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label={tipo === "percentual" ? "Percentual" : "Valor"} obrigatorio value={valor} onChange={(event) => setValor(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" placeholder={tipo === "percentual" ? "10" : "15,00"} />
        <Input label="Pedido mínimo" value={pedidoMinimo} onChange={(event) => setPedidoMinimo(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" />
        <Input label="Desconto máximo" value={descontoMaximo} onChange={(event) => setDescontoMaximo(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" hint="Opcional." />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Validade inicial" type="datetime-local" value={validoDe} onChange={(event) => setValidoDe(event.target.value)} />
        <Input label="Validade final" type="datetime-local" value={validoAte} onChange={(event) => setValidoAte(event.target.value)} />
        <Input label="Limite de usos" type="number" min={1} value={usosMaximos} onChange={(event) => setUsosMaximos(event.target.value)} hint="Opcional." />
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={ativo} onChange={setAtivo} label="Cupom ativo" /> Ativo</label>
      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={aoCancelar}>Cancelar</Button>
        <Button type="submit" carregando={salvando}>{cupom ? "Salvar alterações" : "Criar cupom"}</Button>
      </div>
    </form>
  );
}

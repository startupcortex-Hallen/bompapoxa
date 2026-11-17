import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection, ImageUpload } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch, Textarea } from "@/components/ui/form";
import { EstadoErro, Skeleton } from "@/components/ui/feedback";
import { adminConfiguracoesQuery, chaves } from "@/lib/queries";
import { salvarConfiguracoes, salvarHorarios } from "@/lib/api";
import { DIAS } from "@/lib/hours";
import { moedaBRL, numero } from "@/lib/format";
import { FONTES, PALETAS, estiloTema, validarHex } from "@/lib/theme";
import { useTitulo } from "@/lib/page-title";
import type { Configuracoes, Horario } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  useTitulo("Configurações");
  const { data, isLoading, error, refetch } = useQuery(adminConfiguracoesQuery);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        {[0, 1, 2].map((n) => <Skeleton key={n} className="h-64 rounded-2xl" />)}
      </div>
    );
  }
  if (error || !data) return <EstadoErro mensagem={error instanceof Error ? error.message : "Não foi possível carregar as configurações."} aoTentarNovamente={() => void refetch()} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader titulo="Configurações" descricao="Identidade, contato, entrega, aparência e horários do estabelecimento." />
      <ConfiguracoesForm key={data.configuracoes.updated_at} config={data.configuracoes} />
      <HorariosForm key={`h-${data.horarios.map((h) => h.updated_at).join("-")}`} horarios={data.horarios} />
    </div>
  );
}

function ConfiguracoesForm({ config }: { config: Configuracoes }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(config.nome_estabelecimento);
  const [descricao, setDescricao] = useState(config.descricao ?? "");
  const [logo, setLogo] = useState<string | null>(config.logo_url);
  const [banner, setBanner] = useState<string | null>(config.banner_url);
  const [instagram, setInstagram] = useState(config.instagram_url ?? "");
  const [mensagem, setMensagem] = useState(config.mensagem_boas_vindas ?? "");
  const [rodape, setRodape] = useState(config.rodape ?? "");
  const [whatsapp, setWhatsapp] = useState(config.whatsapp ?? "");
  const [telefone, setTelefone] = useState(config.telefone ?? "");
  const [email, setEmail] = useState(config.email ?? "");
  const [endereco, setEndereco] = useState(config.endereco ?? "");
  const [bairro, setBairro] = useState(config.bairro ?? "");
  const [cidade, setCidade] = useState(config.cidade ?? "");
  const [estado, setEstado] = useState(config.estado ?? "");
  const [cep, setCep] = useState(config.cep ?? "");
  const [mapa, setMapa] = useState(config.mapa_url ?? "");
  const [aceitaDelivery, setAceitaDelivery] = useState(config.aceita_delivery);
  const [aceitaRetirada, setAceitaRetirada] = useState(config.aceita_retirada);
  const [taxa, setTaxa] = useState(String(config.taxa_entrega).replace(".", ","));
  const [freteGratis, setFreteGratis] = useState(config.frete_gratis_acima_de != null ? String(config.frete_gratis_acima_de).replace(".", ",") : "");
  const [pedidoMinimo, setPedidoMinimo] = useState(String(config.pedido_minimo).replace(".", ","));
  const [tempoEntrega, setTempoEntrega] = useState(String(config.tempo_entrega_min));
  const [tempoRetirada, setTempoRetirada] = useState(String(config.tempo_retirada_min));
  const [statusAbertura, setStatusAbertura] = useState(config.status_abertura);
  const [aceitando, setAceitando] = useState(config.aceitando_pedidos);
  const [formas, setFormas] = useState<string[]>(config.formas_pagamento);
  const [primaria, setPrimaria] = useState(config.cor_primaria);
  const [secundaria, setSecundaria] = useState(config.cor_secundaria);
  const [destaque, setDestaque] = useState(config.cor_destaque);
  const [fundo, setFundo] = useState(config.cor_fundo);
  const [texto, setTexto] = useState(config.cor_texto);
  const [tipografia, setTipografia] = useState(config.tipografia);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alternarForma = (forma: string) => {
    setFormas((atual) => (atual.includes(forma) ? atual.filter((f) => f !== forma) : [...atual, forma]));
  };

  const aplicarPaleta = (paleta: (typeof PALETAS)[number]) => {
    setPrimaria(paleta.primaria);
    setSecundaria(paleta.secundaria);
    setDestaque(paleta.destaque);
    setFundo(paleta.fundo);
    setTexto(paleta.texto);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do estabelecimento.");
    if (!aceitaDelivery && !aceitaRetirada) return setErro("Ative entrega, retirada ou ambas.");
    if (!formas.length) return setErro("Escolha ao menos uma forma de pagamento.");
    for (const cor of [primaria, secundaria, destaque, fundo, texto]) {
      if (!validarHex(cor)) return setErro("Todas as cores devem estar no formato #RRGGBB.");
    }
    if (Number(tempoEntrega) < 0 || Number(tempoRetirada) < 0) return setErro("Os tempos não podem ser negativos.");
    setSalvando(true);
    try {
      await salvarConfiguracoes({
        nome_estabelecimento: nome.trim(),
        descricao: descricao.trim() || null,
        logo_url: logo,
        banner_url: banner,
        instagram_url: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        endereco: endereco.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        cep: cep.trim() || null,
        mapa_url: mapa.trim() || null,
        aceita_delivery: aceitaDelivery,
        aceita_retirada: aceitaRetirada,
        taxa_entrega: numero(taxa),
        frete_gratis_acima_de: freteGratis.trim() ? numero(freteGratis) : null,
        pedido_minimo: numero(pedidoMinimo),
        tempo_entrega_min: Number(tempoEntrega) || 0,
        tempo_retirada_min: Number(tempoRetirada) || 0,
        status_abertura: statusAbertura,
        aceitando_pedidos: aceitando,
        formas_pagamento: formas,
        mensagem_boas_vindas: mensagem.trim() || null,
        rodape: rodape.trim() || null,
        cor_primaria: primaria.toUpperCase(),
        cor_secundaria: secundaria.toUpperCase(),
        cor_destaque: destaque.toUpperCase(),
        cor_fundo: fundo.toUpperCase(),
        cor_texto: texto.toUpperCase(),
        tipografia,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: chaves.adminConfiguracoes }),
        qc.invalidateQueries({ queryKey: chaves.cardapio }),
        qc.invalidateQueries({ queryKey: ["layout-publico"] }),
        qc.invalidateQueries({ queryKey: chaves.adminDashboard }),
      ]);
      toast.success("Configurações salvas.");
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-5">
      <AdminSection titulo="Identidade" descricao="O que o cliente vê primeiro no cardápio.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome do estabelecimento" obrigatorio value={nome} onChange={(event) => setNome(event.target.value)} />
          <Input label="Instagram" value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="https://instagram.com/bom_pa_poxa" />
        </div>
        <div className="mt-4">
          <Textarea label="Descrição curta" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={2} maxLength={500} placeholder="Comida boa, feita com carinho." />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ImageUpload valor={logo} onChange={setLogo} pasta="logo" rotulo="Logo" descricao="Envie a arte oficial quando estiver pronta. Enquanto isso, usamos o nome digitado." aspecto="aspect-[4/3]" />
          <ImageUpload valor={banner} onChange={setBanner} pasta="banners" rotulo="Foto de capa" descricao="Recomendado: 1600 × 900 px." aspecto="aspect-[4/3]" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Mensagem de boas-vindas" value={mensagem} onChange={(event) => setMensagem(event.target.value)} maxLength={300} />
          <Input label="Rodapé" value={rodape} onChange={(event) => setRodape(event.target.value)} maxLength={300} />
        </div>
      </AdminSection>

      <AdminSection titulo="Contato e localização" descricao="Usados no rodapé, no cardápio e no acompanhamento do pedido.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="WhatsApp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="(71) 99999-9999" />
          <Input label="Telefone" value={telefone} onChange={(event) => setTelefone(event.target.value)} />
          <Input label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Endereço" value={endereco} onChange={(event) => setEndereco(event.target.value)} />
          <Input label="Bairro" value={bairro} onChange={(event) => setBairro(event.target.value)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Input label="Cidade" value={cidade} onChange={(event) => setCidade(event.target.value)} className="sm:col-span-2" />
          <Input label="Estado" value={estado} onChange={(event) => setEstado(event.target.value)} maxLength={2} />
          <Input label="CEP" value={cep} onChange={(event) => setCep(event.target.value)} />
        </div>
        <div className="mt-4">
          <Input label="Link do mapa" value={mapa} onChange={(event) => setMapa(event.target.value)} placeholder="https://maps.google.com/…" />
        </div>
      </AdminSection>

      <AdminSection titulo="Pedidos e entrega" descricao="Regras aplicadas no servidor ao registrar cada pedido.">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={aceitaDelivery} onChange={setAceitaDelivery} label="Aceitar entrega" /> Entrega</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={aceitaRetirada} onChange={setAceitaRetirada} label="Aceitar retirada" /> Retirada</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={aceitando} onChange={setAceitando} label="Aceitar pedidos" /> Aceitando pedidos</label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input label="Taxa de entrega" value={taxa} onChange={(event) => setTaxa(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" hint={moedaBRL(numero(taxa))} />
          <Input label="Frete grátis acima de" value={freteGratis} onChange={(event) => setFreteGratis(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" hint="Deixe vazio para desativar." />
          <Input label="Pedido mínimo" value={pedidoMinimo} onChange={(event) => setPedidoMinimo(event.target.value.replace(/[^0-9,.]/g, ""))} inputMode="decimal" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input label="Tempo de entrega (min)" type="number" min={0} value={tempoEntrega} onChange={(event) => setTempoEntrega(event.target.value)} />
          <Input label="Tempo de retirada (min)" type="number" min={0} value={tempoRetirada} onChange={(event) => setTempoRetirada(event.target.value)} />
          <Select label="Status da loja" value={statusAbertura} onChange={(event) => setStatusAbertura(event.target.value as Configuracoes["status_abertura"])}>
            <option value="automatico">Automático pelos horários</option>
            <option value="aberto">Forçar aberto</option>
            <option value="fechado">Forçar fechado</option>
          </Select>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Formas de pagamento</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {[
              ["pix", "Pix"],
              ["dinheiro", "Dinheiro"],
              ["cartao", "Cartão"],
            ].map(([valor, rotulo]) => (
              <label key={valor} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <input type="checkbox" checked={formas.includes(valor!)} onChange={() => alternarForma(valor!)} className="accent-primary" />
                {rotulo}
              </label>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection titulo="Aparência" descricao="As cores e a tipografia são aplicadas em todas as páginas públicas.">
        <div className="flex flex-wrap gap-2">
          {PALETAS.map((paleta) => (
            <button key={paleta.nome} type="button" onClick={() => aplicarPaleta(paleta)} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary">
              <span className="flex -space-x-1">
                {[paleta.primaria, paleta.secundaria, paleta.destaque].map((cor) => <span key={cor} className="h-3.5 w-3.5 rounded-full border border-white" style={{ background: cor }} />)}
              </span>
              {paleta.nome}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          {[
            ["Primária", primaria, setPrimaria],
            ["Secundária", secundaria, setSecundaria],
            ["Destaque", destaque, setDestaque],
            ["Fundo", fundo, setFundo],
            ["Texto", texto, setTexto],
          ].map(([rotulo, valor, setter]) => (
            <label key={rotulo as string} className="block">
              <span className="mb-1.5 block text-xs text-muted-foreground">{rotulo as string}</span>
              <span className="flex items-center gap-2 rounded-lg border border-input bg-card p-1.5">
                <input type="color" value={valor as string} onChange={(event) => (setter as (v: string) => void)(event.target.value.toUpperCase())} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={rotulo as string} />
                <input value={valor as string} onChange={(event) => (setter as (v: string) => void)(event.target.value.toUpperCase())} maxLength={7} className="min-w-0 flex-1 bg-transparent font-mono text-[11px] uppercase focus:outline-none" />
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
          <Select label="Tipografia" value={tipografia} onChange={(event) => setTipografia(event.target.value)}>
            {Object.entries(FONTES).map(([chave, fonte]) => <option key={chave} value={chave}>{fonte.rotulo}</option>)}
          </Select>
          <div
            className="rounded-xl border border-border p-4"
            style={estiloTema({ cor_primaria: primaria, cor_secundaria: secundaria, cor_destaque: destaque, cor_fundo: fundo, cor_texto: texto, tipografia })}
          >
            <div className="rounded-lg bg-background p-3 text-foreground">
              <p className="font-display text-lg leading-tight">{nome || "BOM PA POXA"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Prévia das cores e da fonte</p>
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-[10px] text-primary-foreground">Primária</span>
                <span className="rounded-full bg-accent px-3 py-1 text-[10px] text-accent-foreground">Destaque</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ImageUpload valor={logo} onChange={setLogo} pasta="logo" rotulo="Logo" descricao="A logo oficial entra aqui." aspecto="aspect-[4/3]" />
          <ImageUpload valor={banner} onChange={setBanner} pasta="banners" rotulo="Capa" descricao="Imagem principal do cardápio." aspecto="aspect-[4/3]" />
        </div>
      </AdminSection>

      {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
      <div className="sticky bottom-16 z-10 flex justify-end rounded-2xl border border-border bg-background/95 p-3 backdrop-blur md:bottom-4">
        <Button type="submit" carregando={salvando}>
          <Save className="h-4 w-4" /> Salvar configurações
        </Button>
      </div>
    </form>
  );
}

function HorariosForm({ horarios }: { horarios: Horario[] }) {
  const qc = useQueryClient();
  const [dias, setDias] = useState(() =>
    DIAS.map((dia) => {
      const registro = horarios.find((h) => h.dia_semana === dia.valor && h.sequencia === 1);
      return {
        dia_semana: dia.valor,
        fechado: registro?.fechado ?? true,
        abre: registro?.abre?.slice(0, 5) ?? "",
        fecha: registro?.fecha?.slice(0, 5) ?? "",
      };
    }),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = (dia: number, campo: "fechado" | "abre" | "fecha", valor: boolean | string) => {
    setDias((atual) => atual.map((item) => (item.dia_semana === dia ? { ...item, [campo]: valor } : item)));
  };

  const abrirTodos = () => setDias((atual) => atual.map((item) => ({ ...item, fechado: false, abre: item.abre || "11:00", fecha: item.fecha || "22:00" })));
  const fecharTodos = () => setDias((atual) => atual.map((item) => ({ ...item, fechado: true })));

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    for (const dia of dias) {
      if (!dia.fechado && (!dia.abre || !dia.fecha)) return setErro(`Preencha os horários de ${DIAS[dia.dia_semana]?.longo}.`);
      if (!dia.fechado && dia.abre === dia.fecha) return setErro(`Em ${DIAS[dia.dia_semana]?.longo}, abertura e fechamento não podem ser iguais.`);
    }
    setSalvando(true);
    try {
      await salvarHorarios(
        dias.map((dia) => ({
          dia_semana: dia.dia_semana,
          sequencia: 1,
          fechado: dia.fechado,
          abre: dia.fechado ? null : dia.abre,
          fecha: dia.fechado ? null : dia.fecha,
        })),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: chaves.adminConfiguracoes }),
        qc.invalidateQueries({ queryKey: ["layout-publico"] }),
        qc.invalidateQueries({ queryKey: chaves.cardapio }),
      ]);
      toast.success("Horários salvos.");
    } catch (erroSalvar) {
      setErro(erroSalvar instanceof Error ? erroSalvar.message : "Não foi possível salvar os horários.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar}>
      <AdminSection
        titulo="Horários de funcionamento"
        descricao="Usados para calcular se a loja está aberta e permitir pedidos no horário correto."
        acao={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={abrirTodos}><Clock className="h-3.5 w-3.5" /> Abrir todos</Button>
            <Button type="button" variant="outline" size="sm" onClick={fecharTodos}>Fechar todos</Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          {dias.map((dia) => (
            <div key={dia.dia_semana} className="grid items-center gap-3 border-b border-border p-3 last:border-0 sm:grid-cols-[140px_90px_1fr_1fr]">
              <span className="text-sm font-medium">{DIAS[dia.dia_semana]?.longo}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={!dia.fechado} onChange={(aberto) => atualizar(dia.dia_semana, "fechado", !aberto)} label={`Abrir ${DIAS[dia.dia_semana]?.longo}`} />
                {dia.fechado ? "Fechado" : "Aberto"}
              </label>
              <input
                type="time"
                value={dia.abre}
                disabled={dia.fechado}
                onChange={(event) => atualizar(dia.dia_semana, "abre", event.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-50"
                aria-label={`Abertura de ${DIAS[dia.dia_semana]?.longo}`}
              />
              <input
                type="time"
                value={dia.fecha}
                disabled={dia.fechado}
                onChange={(event) => atualizar(dia.dia_semana, "fecha", event.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-50"
                aria-label={`Fechamento de ${DIAS[dia.dia_semana]?.longo}`}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Horários que atravessam a meia-noite são permitidos (ex.: 18:00 às 02:00). O fuso usado é America/Bahia.
        </p>
        {erro ? <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
        <div className="mt-4 flex justify-end">
          <Button type="submit" carregando={salvando}><Check className="h-4 w-4" /> Salvar horários</Button>
        </div>
      </AdminSection>
    </form>
  );
}


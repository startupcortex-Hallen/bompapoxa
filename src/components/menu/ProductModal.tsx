import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, ImageIcon, Timer } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/form";
import { moedaBRL } from "@/lib/format";
import type { Adicional, Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagemProduto, Preco, Quantidade, precoVigente } from "./common";

type Grupo = {
  nome: string;
  adicionais: Adicional[];
  min: number;
  max: number;
  obrigatorio: boolean;
};

function agruparAdicionais(adicionais: Adicional[]): Grupo[] {
  const mapa = new Map<string, Adicional[]>();
  for (const adicional of adicionais) {
    const lista = mapa.get(adicional.grupo) ?? [];
    lista.push(adicional);
    mapa.set(adicional.grupo, lista);
  }
  return [...mapa.entries()].map(([nome, lista]) => {
    const min = Math.max(...lista.map((a) => a.min_qtd));
    const max = Math.min(...lista.map((a) => a.max_qtd));
    return {
      nome,
      adicionais: [...lista].sort((a, b) => a.ordem - b.ordem),
      min,
      max: Number.isFinite(max) ? max : lista.length,
      obrigatorio: min > 0 || lista.some((a) => a.obrigatorio),
    };
  });
}

export function ProdutoModal({
  produto,
  aberto,
  aoFechar,
  aoAdicionar,
  bloqueado,
  nomeEstabelecimento,
  logoUrl,
}: {
  produto: Produto | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAdicionar: (dados: {
    produtoId: string;
    nome: string;
    precoBase: number;
    adicionais: { id: string; nome: string; preco: number }[];
    quantidade: number;
    observacao: string;
    imagemUrl: string | null;
  }) => void;
  bloqueado: boolean;
  nomeEstabelecimento?: string;
  logoUrl?: string | null;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [indiceImagem, setIndiceImagem] = useState(0);

  const grupos = useMemo(() => agruparAdicionais(produto?.adicionais ?? []), [produto]);
  const imagens = useMemo(() => {
    if (!produto) return [];
    return [produto.imagem_url, ...produto.galeria].filter((url): url is string => Boolean(url));
  }, [produto]);

  useEffect(() => {
    if (!aberto) return;
    setQuantidade(1);
    setObservacao("");
    setSelecionados([]);
    setAviso(null);
    setIndiceImagem(0);
  }, [aberto, produto]);

  if (!produto) return null;

  const imagem = imagens[indiceImagem] ?? null;
  const adicionaisSelecionados = produto.adicionais.filter((a) => selecionados.includes(a.id));
  const somaAdicionais = adicionaisSelecionados.reduce((soma, a) => soma + a.preco, 0);
  const unitario = precoVigente(produto) + somaAdicionais;
  const total = unitario * quantidade;

  const alternar = (adicional: Adicional) => {
    setAviso(null);
    const grupo = grupos.find((g) => g.nome === adicional.grupo);
    const noGrupo = grupo ? grupo.adicionais.filter((a) => selecionados.includes(a.id)).length : 0;
    if (!selecionados.includes(adicional.id) && grupo && noGrupo >= grupo.max) {
      setAviso(`Escolha no máximo ${grupo.max} opção(ões) em ${grupo.nome}.`);
      return;
    }
    setSelecionados((atual) =>
      atual.includes(adicional.id) ? atual.filter((id) => id !== adicional.id) : [...atual, adicional.id],
    );
  };

  const adicionar = () => {
    for (const grupo of grupos) {
      const noGrupo = grupo.adicionais.filter((a) => selecionados.includes(a.id)).length;
      const minimo = Math.max(grupo.min, grupo.obrigatorio ? 1 : 0);
      if (noGrupo < minimo) {
        setAviso(`Escolha ao menos ${minimo} opção(ões) em ${grupo.nome}.`);
        return;
      }
    }
    if (!produto.disponivel) {
      setAviso("Este produto está esgotado.");
      return;
    }
    aoAdicionar({
      produtoId: produto.id,
      nome: produto.nome,
      precoBase: precoVigente(produto),
      adicionais: adicionaisSelecionados.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco })),
      quantidade,
      observacao,
      imagemUrl: produto.imagem_url,
    });
    toast.success(`${produto.nome} adicionado à sacola.`);
    aoFechar();
  };

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={produto.nome} largura="max-w-3xl">
      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-secondary">
            {imagem ? (
              <img src={imagem} alt={produto.nome} className="h-full w-full object-cover" />
            ) : (
              <ImagemProduto url={null} nome={produto.nome} />
            )}
            <div className="absolute left-3 top-3 z-10 rounded-full border border-white/50 bg-background/90 px-3 py-1.5 backdrop-blur">
              <BrandLogo nome={nomeEstabelecimento ?? "BOM PA POXA"} logoUrl={logoUrl} compacto />
            </div>
            {imagens.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIndiceImagem((atual) => (atual - 1 + imagens.length) % imagens.length)}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIndiceImagem((atual) => (atual + 1) % imagens.length)}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                  {imagens.map((url, indice) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setIndiceImagem(indice)}
                      aria-label={`Ver imagem ${indice + 1}`}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        indice === indiceImagem ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white",
                      )}
                    />
                  ))}
                </div>
              </>
            ) : null}
            {!produto.disponivel ? (
              <div className="absolute inset-0 grid place-items-center bg-black/55">
                <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black">Esgotado</span>
              </div>
            ) : null}
          </div>
          {imagens.length > 1 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {imagens.map((url, indice) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setIndiceImagem(indice)}
                  className={cn(
                    "h-14 w-16 shrink-0 overflow-hidden rounded-lg border",
                    indice === indiceImagem ? "border-primary" : "border-border",
                  )}
                  aria-label={`Ver imagem ${indice + 1}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          {imagens.length === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ImageIcon className="h-3 w-3" /> Foto do produto será adicionada pelo estabelecimento.
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {produto.destaque ? <Badge cor="accent">Destaque</Badge> : null}
            {produto.tempo_preparo_min ? (
              <Badge>
                <Timer className="h-3 w-3" /> {produto.tempo_preparo_min} min
              </Badge>
            ) : null}
            {!produto.disponivel ? <Badge cor="danger">Esgotado</Badge> : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {produto.descricao || "Sem descrição. Pergunte ao estabelecimento se precisar de detalhes."}
          </p>

          <div className="mt-4">
            <Preco produto={produto} tamanho="lg" />
          </div>

          {produto.ingredientes.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Ingredientes</p>
              <p className="mt-1 text-sm">{produto.ingredientes.join(" • ")}</p>
            </div>
          ) : null}

          {grupos.length ? (
            <div className="mt-5 space-y-4">
              {grupos.map((grupo) => (
                <div key={grupo.nome} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{grupo.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {grupo.obrigatorio ? "Obrigatório" : "Opcional"}
                        {grupo.max > 1 ? ` • até ${grupo.max}` : ""}
                      </p>
                    </div>
                    {grupo.obrigatorio ? <Badge cor="danger">Escolha</Badge> : null}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {grupo.adicionais.map((adicional) => {
                      const marcado = selecionados.includes(adicional.id);
                      return (
                        <button
                          key={adicional.id}
                          type="button"
                          onClick={() => alternar(adicional)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                            marcado ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                                marcado ? "border-primary bg-primary text-primary-foreground" : "border-border",
                              )}
                            >
                              {marcado ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">{adicional.nome}</span>
                              {adicional.descricao ? (
                                <span className="block truncate text-[11px] text-muted-foreground">{adicional.descricao}</span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium">{adicional.preco > 0 ? `+ ${moedaBRL(adicional.preco)}` : "Grátis"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <Textarea
              label="Alguma observação?"
              placeholder="Ex.: sem cebola, ponto da carne, embalar separado…"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          {aviso ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Quantidade valor={quantidade} onChange={setQuantidade} max={30} />
            <Button onClick={adicionar} disabled={!produto.disponivel || bloqueado} className="flex-1 sm:flex-none">
              Adicionar • {moedaBRL(total)}
            </Button>
          </div>
          {bloqueado ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {produto.disponivel ? "Pedidos pausados no momento. Você pode montar a sacola." : "Produto esgotado."}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}



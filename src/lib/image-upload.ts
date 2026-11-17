import { supabase } from "@/integrations/supabase/client";

const BUCKET = "cardapio-exemplo-imagens";
export type PastaImagem = "logo" | "banners" | "categorias" | "produtos" | "combos";

async function comprimir(arquivo: File, ladoMaximo: number, qualidade: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível comprimir a imagem."))),
      "image/webp",
      qualidade,
    );
  });
}

export async function removerImagem(url: string): Promise<void> {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const posicao = url.indexOf(marcador);
  if (posicao < 0) return;
  const caminho = decodeURIComponent(url.slice(posicao + marcador.length).split("?")[0] ?? "");
  if (!caminho) return;
  const { error } = await supabase.storage.from(BUCKET).remove([caminho]);
  if (error) throw error;
}

export async function removerImagens(urls: (string | null | undefined)[]): Promise<void> {
  const unicas = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  await Promise.all(unicas.map((url) => removerImagem(url).catch(() => undefined)));
}

export async function enviarImagem(arquivo: File, pasta: PastaImagem): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  if (arquivo.size > 8 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 8 MB.");
  const comprimida = await comprimir(arquivo, 1800, 0.82);
  const caminho = `${pasta}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, comprimida, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

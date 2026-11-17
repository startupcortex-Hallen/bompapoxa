export function linkWhatsApp(numero: string | null | undefined): string | null {
  if (!numero) return null;
  const digitos = numero.replace(/\D/g, "");
  return digitos.length >= 10 ? `https://wa.me/${digitos}` : null;
}

export function urlExterna(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const destino = new URL(url);
    return destino.protocol === "http:" || destino.protocol === "https:" ? destino.toString() : null;
  } catch {
    return null;
  }
}

export function linkInstagram(url: string | null | undefined): string | null {
  if (!url) return null;
  const externo = urlExterna(url);
  if (externo) return externo;
  const perfil = url.replace(/^@/, "").trim();
  return perfil ? `https://instagram.com/${encodeURIComponent(perfil)}` : null;
}

import { somenteDigitos } from "./format";

export type Coordenadas = { latitude: number; longitude: number };

export type EnderecoGeocodificado = {
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  rotulo: string;
  coordenadas: Coordenadas;
};

type ViaCepResposta = {
  erro?: boolean | string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

type PhotonFeature = {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: unknown };
};

type PhotonResposta = { features?: PhotonFeature[] };

export function formatarCep(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export async function buscarCep(cep: string): Promise<{
  cep: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
} | null> {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!resposta.ok) throw new Error("Não foi possível consultar o CEP.");
  const dados = (await resposta.json()) as ViaCepResposta;
  if (dados.erro === true || dados.erro === "true") return null;
  return {
    cep: formatarCep(dados.cep ?? digitos),
    endereco: dados.logradouro?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.localidade?.trim() || null,
    estado: dados.uf?.trim() || null,
  };
}

function textoPropriedade(propriedades: Record<string, unknown>, chaves: string[]): string | null {
  for (const chave of chaves) {
    const valor = propriedades[chave];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
    if (typeof valor === "number") return String(valor);
  }
  return null;
}

function mapearFeature(feature: PhotonFeature, fallback: string): EnderecoGeocodificado | null {
  const coordenadas = feature.geometry?.coordinates;
  if (!Array.isArray(coordenadas) || coordenadas.length < 2) return null;
  const longitude = Number(coordenadas[0]);
  const latitude = Number(coordenadas[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const props = feature.properties ?? {};
  const rua = textoPropriedade(props, ["street", "name"]);
  const numero = textoPropriedade(props, ["housenumber"]);
  const bairro = textoPropriedade(props, ["district", "locality", "city_district"]);
  const cidade = textoPropriedade(props, ["city", "town", "village", "municipality"]);
  const estado = textoPropriedade(props, ["state"]);
  const cep = textoPropriedade(props, ["postcode"]);
  const rotulo =
    [rua, numero].filter(Boolean).join(", ") ||
    textoPropriedade(props, ["name", "city", "street"]) ||
    fallback;
  return {
    ...(cep ? { cep: formatarCep(cep) } : {}),
    ...(rua ? { endereco: rua } : {}),
    ...(numero ? { numero } : {}),
    ...(bairro ? { bairro } : {}),
    ...(cidade ? { cidade } : {}),
    ...(estado ? { estado } : {}),
    rotulo,
    coordenadas: { latitude, longitude },
  };
}

export async function buscarEnderecoPhoton(texto: string): Promise<EnderecoGeocodificado[]> {
  const consulta = texto.trim();
  if (consulta.length < 3) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(consulta)}&limit=6`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Busca de endereço indisponível.");
  const dados = (await resposta.json()) as PhotonResposta;
  return (dados.features ?? [])
    .map((feature) => mapearFeature(feature, consulta))
    .filter((item): item is EnderecoGeocodificado => item !== null);
}

export async function reverterCoordenadas(latitude: number, longitude: number): Promise<EnderecoGeocodificado> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=1`;
    const resposta = await fetch(url);
    if (resposta.ok) {
      const dados = (await resposta.json()) as PhotonResposta;
      const primeiro = dados.features?.[0];
      const mapeado = primeiro ? mapearFeature(primeiro, "Local selecionado") : null;
      if (mapeado) return mapeado;
    }
  } catch {
    // O ponto continua válido mesmo se o serviço de reverse geocoding falhar.
  }
  return { rotulo: "Local selecionado", coordenadas: { latitude, longitude } };
}

export async function buscarCoordenadasEndereco(texto: string): Promise<Coordenadas | null> {
  try {
    const resultados = await buscarEnderecoPhoton(texto);
    return resultados[0]?.coordenadas ?? null;
  } catch {
    return null;
  }
}

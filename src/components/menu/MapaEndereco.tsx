import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LoaderCircle, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buscarEnderecoPhoton,
  reverterCoordenadas,
  type Coordenadas,
  type EnderecoGeocodificado,
} from "@/lib/geocoding";
import { cn } from "@/lib/utils";

const CENTRO_BRASIL: [number, number] = [-14.235, -51.925];

const PIN = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#b23a2a;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35)"><div style="width:8px;height:8px;border-radius:50%;background:#fff;margin:7px auto 0;transform:rotate(45deg)"></div></div>',
});

export function MapaEndereco({
  coordenadas,
  aoMudar,
  className,
}: {
  coordenadas: Coordenadas | null;
  aoMudar: (coordenadas: Coordenadas, endereco?: EnderecoGeocodificado) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const aoMudarRef = useRef(aoMudar);
  const selecionarRef = useRef<(latitude: number, longitude: number) => Promise<void>>(async () => undefined);
  const coordenadasRef = useRef(coordenadas);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<EnderecoGeocodificado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    aoMudarRef.current = aoMudar;
  }, [aoMudar]);

  useEffect(() => {
    coordenadasRef.current = coordenadas;
  }, [coordenadas]);

  const colocarMarcador = (ponto: Coordenadas) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const posicao: [number, number] = [ponto.latitude, ponto.longitude];
    if (marcadorRef.current) {
      marcadorRef.current.setLatLng(posicao);
      return;
    }
    const marcador = L.marker(posicao, { draggable: true, icon: PIN }).addTo(mapa);
    marcador.on("dragend", () => {
      const pos = marcador.getLatLng();
      void selecionarRef.current(pos.lat, pos.lng);
    });
    marcadorRef.current = marcador;
  };

  selecionarRef.current = async (latitude: number, longitude: number) => {
    const ponto = { latitude, longitude };
    colocarMarcador(ponto);
    const mapa = mapaRef.current;
    if (mapa) mapa.setView([latitude, longitude], Math.max(mapa.getZoom(), 15));
    setBuscandoEndereco(true);
    setErro(null);
    try {
      const endereco = await reverterCoordenadas(latitude, longitude);
      aoMudarRef.current(ponto, endereco);
    } finally {
      setBuscandoEndereco(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapaRef.current) return;
    const inicial = coordenadasRef.current;
    const mapa = L.map(containerRef.current, {
      center: inicial ? [inicial.latitude, inicial.longitude] : CENTRO_BRASIL,
      zoom: inicial ? 16 : 4,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    mapa.on("click", (evento) => {
      void selecionarRef.current(evento.latlng.lat, evento.latlng.lng);
    });
    mapaRef.current = mapa;
    if (inicial) {
      colocarMarcador(inicial);
    }
    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!coordenadas || !mapaRef.current) return;
    colocarMarcador(coordenadas);
    const mapa = mapaRef.current;
    const zoom = mapa.getZoom();
    if (zoom < 15) mapa.setView([coordenadas.latitude, coordenadas.longitude], 16);
    else mapa.panTo([coordenadas.latitude, coordenadas.longitude]);
  }, [coordenadas]);

  const pesquisar = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setErro(null);
    setResultados([]);
    if (busca.trim().length < 3) {
      setErro("Digite pelo menos 3 caracteres para buscar.");
      return;
    }
    setBuscando(true);
    try {
      const lista = await buscarEnderecoPhoton(busca);
      if (!lista.length) setErro("Nenhum endereço encontrado. Tente incluir a cidade.");
      setResultados(lista);
    } catch {
      setErro("A busca de endereço está indisponível agora. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  };

  const escolherResultado = (resultado: EnderecoGeocodificado) => {
    setResultados([]);
    setBusca(resultado.rotulo);
    setErro(null);
    colocarMarcador(resultado.coordenadas);
    mapaRef.current?.flyTo([resultado.coordenadas.latitude, resultado.coordenadas.longitude], 16);
    aoMudarRef.current(resultado.coordenadas, resultado);
  };

  const usarLocalizacao = () => {
    setErro(null);
    if (!navigator.geolocation) {
      setErro("A geolocalização não está disponível neste navegador.");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const ponto = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
        colocarMarcador(ponto);
        mapaRef.current?.flyTo([ponto.latitude, ponto.longitude], 17);
        void reverterCoordenadas(ponto.latitude, ponto.longitude)
          .then((endereco) => aoMudarRef.current(ponto, endereco))
          .finally(() => setLocalizando(false));
      },
      (falha) => {
        setLocalizando(false);
        setErro(
          falha.code === falha.PERMISSION_DENIED
            ? "Permissão de localização negada. Preencha o endereço manualmente ou toque no mapa."
            : "Não foi possível obter sua localização. Toque no mapa para escolher o ponto.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <form onSubmit={pesquisar} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar rua, bairro ou ponto de referência"
            aria-label="Buscar endereço no mapa"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" size="sm" carregando={buscando} className="flex-1 sm:flex-none">
            <Search className="h-3.5 w-3.5" /> Buscar
          </Button>
          <Button type="button" variant="outline" size="sm" carregando={localizando} onClick={usarLocalizacao} className="flex-1 sm:flex-none">
            <LocateFixed className="h-3.5 w-3.5" /> Minha localização
          </Button>
        </div>
      </form>

      {resultados.length ? (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card">
          {resultados.map((resultado, indice) => (
            <li key={`${resultado.rotulo}-${resultado.coordenadas.latitude}-${indice}`} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => escolherResultado(resultado)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-secondary/60"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-foreground">{resultado.rotulo}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {[resultado.bairro, resultado.cidade, resultado.estado].filter(Boolean).join(" • ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={containerRef} className="h-[220px] w-full bg-secondary" />
        {buscandoEndereco ? (
          <span className="absolute left-3 top-3 z-[500] inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Localizando endereço…
          </span>
        ) : null}
      </div>
      {erro ? (
        <p className="text-xs text-danger">{erro}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Toque no mapa ou arraste o pino para ajustar o ponto exato. Busca por OpenStreetMap/Photon.
        </p>
      )}
    </div>
  );
}

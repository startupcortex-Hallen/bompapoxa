import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import type QRCodeStyling from "qr-code-styling";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { EstadoErro, Skeleton } from "@/components/ui/feedback";
import { adminConfiguracoesQuery } from "@/lib/queries";
import { urlAbsoluta } from "@/integrations/supabase/client";
import { luminancia } from "@/lib/theme";
import { useTitulo } from "@/lib/page-title";

export const Route = createFileRoute("/_authenticated/admin/qr")({
  component: QrPage,
});

function QrPage() {
  useTitulo("QR do cardápio");
  const { data, isLoading, error, refetch } = useQuery(adminConfiguracoesQuery);
  const container = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [url, setUrl] = useState("");
  const [gerando, setGerando] = useState(true);

  useEffect(() => {
    if (!data) return;
    let cancelado = false;
    setGerando(true);
    setUrl(urlAbsoluta("/"));
    void (async () => {
      try {
        const { default: QRCodeStyling } = await import("qr-code-styling");
        if (cancelado) return;
        const corQr = luminancia(data.configuracoes.cor_primaria) > 0.55 ? "#2A1710" : data.configuracoes.cor_primaria;
        const qr = new QRCodeStyling({
          width: 720,
          height: 720,
          type: "canvas",
          data: urlAbsoluta("/"),
          margin: 36,
          qrOptions: { errorCorrectionLevel: "M" },
          dotsOptions: { color: corQr, type: "rounded" },
          cornersSquareOptions: { color: corQr, type: "extra-rounded" },
          cornersDotOptions: { color: corQr, type: "dot" },
          backgroundOptions: { color: "#FFFFFF" },
        });
        qrRef.current = qr;
        if (container.current) {
          container.current.innerHTML = "";
          qr.append(container.current);
        }
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o QR code.");
      } finally {
        if (!cancelado) setGerando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [data]);

  const baixar = async () => {
    try {
      const blob = await qrRef.current?.getRawData("png");
      if (!(blob instanceof Blob)) throw new Error("QR code ainda não está pronto.");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "bom-pa-poxa-cardapio.png";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível baixar.");
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os dados do cardápio."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader titulo="QR do cardápio" descricao="Imprima e espalhe o link do cardápio em mesas, balcão, embalagens e redes sociais." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <AdminSection titulo="Seu QR code" descricao="Aponte a câmera do celular para abrir o cardápio.">
          <div className="grid place-items-center rounded-2xl border border-border bg-white p-5">
            {gerando ? <Skeleton className="aspect-square w-full max-w-xs" /> : null}
            <div ref={container} className="max-w-xs overflow-hidden [&_canvas]:h-auto [&_canvas]:w-full" aria-label="QR code do cardápio" />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => void baixar()} disabled={gerando}><Download className="h-4 w-4" /> Baixar PNG</Button>
            <Button variant="outline" onClick={() => void copiar()}><Copy className="h-4 w-4" /> Copiar link</Button>
          </div>
        </AdminSection>

        <AdminSection titulo="Link público" descricao="Este é o endereço que o cliente acessa.">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <p className="break-all text-sm">{url}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink className="h-4 w-4" /> Abrir cardápio</Button>
            </a>
          </div>
          <div className="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><QrCode className="h-4 w-4" /> Dicas</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Imprima com boa resolução para facilitar a leitura.</li>
              <li>Teste o QR code com o celular antes de imprimir em quantidade.</li>
              <li>O cardápio é atualizado automaticamente quando você altera produtos e preços.</li>
            </ul>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

export function BrandLogo({
  nome = "BOM PA POXA",
  logoUrl,
  className,
  compacto = false,
  subtitulo,
}: {
  nome?: string;
  logoUrl?: string | null;
  className?: string;
  compacto?: boolean;
  subtitulo?: string | null;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nome}
        className={cn("h-12 w-auto max-w-[190px] object-contain", compacto && "h-9 max-w-[140px]", className)}
      />
    );
  }
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} aria-label={nome}>
      <span
        className={cn(
          "font-display font-normal uppercase tracking-[0.04em] text-foreground",
          compacto ? "text-2xl" : "text-3xl sm:text-[2.1rem]",
        )}
      >
        {nome}
      </span>
      {subtitulo ? (
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{subtitulo}</span>
      ) : null}
    </span>
  );
}

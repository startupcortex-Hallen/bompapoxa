import { useState } from "react";
import { Link, Outlet, useLocation, useRouter, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Printer,
  QrCode,
  ReceiptText,
  Settings,
  Star,
  Store,
  Tags,
  TicketPercent,
  UserRound,
  UtensilsCrossed,
  Image as ImageIcon,
  PlusCircle,
} from "lucide-react";
import { AutoPrintBluetooth } from "@/components/admin/AutoPrintBluetooth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { layoutPublicoQuery } from "@/lib/queries";
import { estiloTema } from "@/lib/theme";
import { rotuloAbertura } from "@/lib/hours";
import { sair } from "@/lib/auth";
import { urlDoApp } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const GRUPOS = [
  {
    rotulo: "Operação",
    itens: [
      { to: "/admin", rotulo: "Visão geral", icone: LayoutDashboard },
      { to: "/admin/pedidos", rotulo: "Pedidos", icone: ReceiptText },
    ],
  },
  {
    rotulo: "Cardápio",
    itens: [
      { to: "/admin/categorias", rotulo: "Categorias", icone: Tags },
      { to: "/admin/produtos", rotulo: "Produtos", icone: UtensilsCrossed },
      { to: "/admin/adicionais", rotulo: "Adicionais", icone: PlusCircle },
      { to: "/admin/combos", rotulo: "Combos", icone: Package },
    ],
  },
  {
    rotulo: "Loja",
    itens: [
      { to: "/admin/banners", rotulo: "Banners", icone: ImageIcon },
      { to: "/admin/cupons", rotulo: "Cupons", icone: TicketPercent },
      { to: "/admin/pagamentos", rotulo: "Pagamentos", icone: CreditCard },
      { to: "/admin/impressao", rotulo: "Impressora", icone: Printer },
      { to: "/admin/avaliacoes", rotulo: "Avaliações", icone: Star },
      { to: "/admin/configuracoes", rotulo: "Configurações", icone: Settings },
      { to: "/admin/qr", rotulo: "QR do cardápio", icone: QrCode },
    ],
  },
  {
    rotulo: "Conta",
    itens: [{ to: "/admin/conta", rotulo: "Minha conta", icone: UserRound }],
  },
] as const;

const MOBILE = [
  { to: "/admin", rotulo: "Início", icone: LayoutDashboard },
  { to: "/admin/pedidos", rotulo: "Pedidos", icone: ReceiptText },
  { to: "/admin/produtos", rotulo: "Produtos", icone: UtensilsCrossed },
  { to: "/admin/configuracoes", rotulo: "Ajustes", icone: Settings },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: layout } = useQuery(layoutPublicoQuery);
  const [menuAberto, setMenuAberto] = useState(false);
  const config = layout?.configuracoes;
  const aberto = Boolean(layout?.aberto);

  const ativo = (to: string) => (to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(to));

  const sairAgora = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await sair();
    } catch {
      // A sessão local é limpa mesmo se o servidor não responder.
    }
    await router.invalidate();
    window.location.assign(urlDoApp("/login"));
  };

  return (
    <div
      style={config ? estiloTema(config) : undefined}
      className="theme-cinema min-h-screen bg-background text-foreground md:grid md:grid-cols-[248px_1fr]"
    >
      <AutoPrintBluetooth />
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card/60 px-4 py-5 md:flex">
        <Link to="/" className="px-2" aria-label="Ver cardápio">
          <BrandLogo nome={config?.nome_estabelecimento} logoUrl={config?.logo_url} compacto />
        </Link>
        <p className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Painel</p>
        <nav className="mt-3 flex-1 overflow-y-auto">
          {GRUPOS.map((grupo) => (
            <div key={grupo.rotulo} className="mb-5">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{grupo.rotulo}</p>
              <div className="mt-1.5 space-y-0.5">
                {grupo.itens.map((item) => {
                  const Icone = item.icone;
                  const selecionado = ativo(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                        selecionado ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <Icone className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.rotulo}</span>
                      {selecionado ? <ChevronRight className="ml-auto h-3.5 w-3.5" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <Link to="/" target="_blank" className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" /> Ver cardápio
          </Link>
          <button type="button" onClick={() => void sairAgora()} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-md sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/" aria-label="Ver cardápio">
              <BrandLogo nome={config?.nome_estabelecimento} logoUrl={config?.logo_url} compacto className="scale-90 origin-left" />
            </Link>
          </div>
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm">{config?.nome_estabelecimento ?? "BOM PA POXA"}</span>
            <span className="text-border">/</span>
            <span className="text-xs text-muted-foreground">Painel administrativo</span>
          </div>
          <div className="flex items-center gap-2">
            {config ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground sm:inline-flex">
                <span className={cn("h-1.5 w-1.5 rounded-full", aberto && config.aceitando_pedidos ? "bg-success" : "bg-muted-foreground")} />
                {rotuloAbertura(config, layout?.horarios ?? [], aberto)}
              </span>
            ) : null}
            <Link to="/" target="_blank" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5" /> Cardápio
              </Button>
            </Link>
            <button type="button" onClick={() => void sairAgora()} className="text-xs text-muted-foreground hover:text-foreground md:hidden">
              Sair
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 md:px-8 md:py-9">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/96 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Navegação administrativa">
        {MOBILE.map((item) => {
          const Icone = item.icone;
          const selecionado = ativo(item.to);
          return (
            <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", selecionado ? "text-primary" : "text-muted-foreground")}>
              <Icone className="h-5 w-5" />
              {item.rotulo}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMenuAberto(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground">
          <Menu className="h-5 w-5" /> Mais
        </button>
      </nav>

      <Modal aberto={menuAberto} aoFechar={() => setMenuAberto(false)} titulo="Mais opções" largura="max-w-md">
        <div className="space-y-5">
          {GRUPOS.map((grupo) => (
            <div key={grupo.rotulo}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{grupo.rotulo}</p>
              <div className="grid gap-1">
                {grupo.itens.map((item) => {
                  const Icone = item.icone;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuAberto(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm",
                        ativo(item.to) ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                      )}
                    >
                      <Icone className="h-4 w-4" /> {item.rotulo}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="space-y-1 border-t border-border pt-3">
            <Link to="/" target="_blank" onClick={() => setMenuAberto(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Ver cardápio
            </Link>
            <button type="button" onClick={() => void sairAgora()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10">
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


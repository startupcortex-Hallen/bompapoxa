import { QueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function NaoEncontrado() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <p className="eyebrow">BOM PA POXA</p>
        <h1 className="mt-3 text-5xl">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O endereço que você tentou abrir não existe ou foi movido.
        </p>
        <Link to="/" className="mt-6 inline-flex">
          <Button>Voltar ao cardápio</Button>
        </Link>
      </div>
    </div>
  );
}

function Erro({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <p className="eyebrow">BOM PA POXA</p>
        <h1 className="mt-3 text-4xl">Esta página não carregou</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro inesperado."}</p>
        <Button
          className="mt-6"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Raiz,
  notFoundComponent: NaoEncontrado,
  errorComponent: Erro,
});

function Raiz() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED") return;
      void router.invalidate();
      if (evento !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <>
      <Outlet />
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
    </>
  );
}

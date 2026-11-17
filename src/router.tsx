import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function criarRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    basepath: import.meta.env.BASE_URL.replace(/\/+$/, ""),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error }) => (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="max-w-md text-center">
          <p className="eyebrow">BOM PA POXA</p>
          <h1 className="mt-3 text-4xl">Algo deu errado</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erro inesperado."}</p>
          <a href={import.meta.env.BASE_URL} className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">
            Voltar ao cardápio
          </a>
        </div>
      </div>
    ),
  });
}

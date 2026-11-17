import { createFileRoute } from "@tanstack/react-router";
import { MenuPage } from "@/components/menu/MenuPage";

export const Route = createFileRoute("/produto/$produtoId")({
  component: ProdutoDetalhe,
});

function ProdutoDetalhe() {
  const { produtoId } = Route.useParams();
  return <MenuPage detalhe={{ tipo: "produto", id: produtoId }} />;
}

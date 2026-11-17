import { createFileRoute } from "@tanstack/react-router";
import { MenuPage } from "@/components/menu/MenuPage";

export const Route = createFileRoute("/combo/$comboId")({
  component: ComboDetalhe,
});

function ComboDetalhe() {
  const { comboId } = Route.useParams();
  return <MenuPage detalhe={{ tipo: "combo", id: comboId }} />;
}

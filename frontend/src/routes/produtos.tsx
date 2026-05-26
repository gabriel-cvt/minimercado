import { createFileRoute } from "@tanstack/react-router";
import { ProductsManagement } from "@/components/mcd/ProductsManagement";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Gestao de Produtos - McDominus" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return <ProductsManagement />;
}

import { createFileRoute } from "@tanstack/react-router";
import { ProductsManagement } from "@/components/mcd/ProductsManagement";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Gestão de Produtos - McDomine's" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return <ProductsManagement />;
}

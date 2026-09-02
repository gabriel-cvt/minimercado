import { createFileRoute } from "@tanstack/react-router";
import { ProductsManagement } from "@/components/mcd/ProductsManagement";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Sistema de Pedidos" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return <ProductsManagement />;
}

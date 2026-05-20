import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { KitchenOrderEvent, PickupOrderEvent } from "./websocket-types";

export function useKitchenOrderToast() {
  const queryClient = useQueryClient();
  return (evt: KitchenOrderEvent) => {
    const id = `#${evt.orderId}`;
    if (evt.type === "CREATED") {
      toast.success("Novo pedido recebido!", {
        description: `Pedido ${id} enviado para a cozinha.`,
      });
    } else if (evt.type === "UPDATED") {
      toast("Pedido atualizado.", {
        description: `Pedido ${id} foi alterado.`,
      });
    } else if (evt.type === "CANCELLED") {
      toast.error("Pedido cancelado.", {
        description: `Pedido ${id} foi cancelado.`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function usePickupOrderToast() {
  const queryClient = useQueryClient();
  return (evt: PickupOrderEvent) => {
    toast.success(`Pedido #${evt.orderId} pronto para retirada!`, {
      description: "Dirija-se ao balcão de retirada.",
    });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["pickup-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { KitchenOrderEvent, PickupOrderEvent } from "./websocket-types";

type RealtimeNotice = `kitchen:${KitchenOrderEvent["type"]}` | "pickup";

const localNotices = new Map<string, number>();
const LOCAL_NOTICE_TTL_MS = 8_000;

export function suppressNextRealtimeToast(orderId: number, notice: RealtimeNotice) {
  localNotices.set(`${notice}:${orderId}`, Date.now() + LOCAL_NOTICE_TTL_MS);
}

export function clearSuppressedRealtimeToast(orderId: number, notice: RealtimeNotice) {
  localNotices.delete(`${notice}:${orderId}`);
}

function consumeLocalNotice(orderId: number, notice: RealtimeNotice) {
  const key = `${notice}:${orderId}`;
  const expiration = localNotices.get(key);
  localNotices.delete(key);
  return expiration !== undefined && expiration >= Date.now();
}

function hideRealtimeToast(pathname: string, notice: RealtimeNotice) {
  if (pathname.startsWith("/cozinha") || pathname.startsWith("/painel")) return true;
  return pathname.startsWith("/dashboard") && notice !== "kitchen:CANCELLED";
}

export function useKitchenOrderToast(pathname: string) {
  const queryClient = useQueryClient();
  return (evt: KitchenOrderEvent) => {
    const id = `#${evt.orderId}`;
    const notice = `kitchen:${evt.type}` as const;
    const hidden = consumeLocalNotice(evt.orderId, notice) || hideRealtimeToast(pathname, notice);
    if (!hidden && evt.type === "CREATED") {
      toast.success("Novo pedido recebido!", {
        description: `Pedido ${id} enviado para a cozinha.`,
        duration: 2_800,
      });
    } else if (!hidden && evt.type === "UPDATED") {
      toast("Pedido atualizado.", {
        description: `Pedido ${id} foi alterado.`,
        duration: 2_800,
      });
    } else if (!hidden && evt.type === "CANCELLED") {
      toast.error("Pedido cancelado.", {
        description: `Pedido ${id} foi cancelado.`,
        duration: 6_000,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function usePickupOrderToast(pathname: string) {
  const queryClient = useQueryClient();
  return (evt: PickupOrderEvent) => {
    const hidden =
      consumeLocalNotice(evt.orderId, "pickup") || hideRealtimeToast(pathname, "pickup");
    if (!hidden) {
      toast.success(`Pedido #${evt.orderId} pronto para retirada!`, {
        description: "Dirija-se ao balcão de retirada.",
        duration: 2_800,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["pickup-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

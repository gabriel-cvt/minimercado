export interface KitchenOrderItem {
  productId: number;
  productName: string;
  quantity: number;
}

export type KitchenOrderEventType = "CREATED" | "UPDATED" | "CANCELLED";

export interface KitchenOrderEvent {
  orderId: number;
  type: KitchenOrderEventType;
  items: KitchenOrderItem[];
}

export interface PickupOrderEvent {
  orderId: number;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export const WS_TOPICS = {
  kitchenOrders: "/topic/kitchen/orders",
  pickupOrders: "/topic/pickup/orders",
} as const;
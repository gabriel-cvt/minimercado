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

export type OrderRealtimeEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_PAID"
  | "ORDER_CANCELLED";

export type ApiOrderStatus = "PENDING" | "READY_FOR_PICKUP" | "FINISHED" | "CANCELLED";

export type ApiPaymentStatus = "PENDING" | "PAID" | "CANCELLED";

export interface OrderRealtimeEvent {
  orderId: number;
  type: OrderRealtimeEventType;
  status?: ApiOrderStatus;
  paymentStatus?: ApiPaymentStatus;
  fromStatus?: ApiOrderStatus;
  toStatus?: ApiOrderStatus;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export const WS_TOPICS = {
  orders: "/topic/orders",
  ordersPublic: "/topic/orders/public",
  kitchenOrders: "/topic/kitchen/orders",
  pickupOrders: "/topic/pickup/orders",
} as const;

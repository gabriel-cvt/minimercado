export type KitchenName = "Sandwiches" | "Drinks" | "Desserts" | "General";
export type OrderStatus = "preparing" | "assembly" | "finished";
export type PaymentMethod = "pix" | "cash" | "pending";

export interface Customer { id: string; cpf: string; fullName: string; }
export interface Product { id: string; name: string; price: number; imageUrl: string; kitchen: KitchenName; }
export interface OrderItem { productId: string; name: string; quantity: number; price: number; kitchen: KitchenName; }
export interface Order {
  id: string; number: number; customerId: string; customerName: string;
  items: OrderItem[]; total: number; paymentMethod: PaymentMethod;
  status: OrderStatus; createdAt: number; finishedAt?: number;
}

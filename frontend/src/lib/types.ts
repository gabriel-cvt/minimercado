export type KitchenName = "Sanduíches" | "Bebidas" | "Sobremesas" | "Geral";
export type OrderStatus = "preparing" | "assembly" | "finished";
export type PaymentMethod = "pix" | "cash" | "pending";
export type PaymentStatus = "paid" | "pending" | "overdue";

export interface Customer { id: string; cpf: string; fullName: string; }
export interface Product { id: string; name: string; price: number; imageUrl: string; kitchen: KitchenName; }
export interface OrderItem { productId: string; name: string; quantity: number; price: number; kitchen: KitchenName; }
export interface Order {
  id: string; number: number; customerId: string; customerName: string;
  items: OrderItem[]; total: number; paymentMethod: PaymentMethod;
  status: OrderStatus; paymentStatus: PaymentStatus;
  createdAt: number; finishedAt?: number;
}

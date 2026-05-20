import type { ApiOrderStatus, ApiPaymentStatus } from "@/websocket/websocket-types";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8080";

export interface ApiClient {
  id: number;
  name: string;
  cpf: string;
  phoneNumber?: string;
}

export interface ApiOrderItem {
  productId: number;
  productName: string;
  requiresKitchenPreparation: boolean;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ApiOrder {
  id: number;
  orderTime: string;
  status: ApiOrderStatus;
  paymentStatus: ApiPaymentStatus;
  items: ApiOrderItem[];
  client: ApiClient;
  paymentMethod: "PIX" | "DINHEIRO" | "PENDING";
  totalValue: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Erro ${response.status} ao acessar ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getKitchenPendingOrders() {
  const params = new URLSearchParams({
    status: "PENDING",
    requiresKitchenPreparation: "true",
    page: "0",
    size: "50",
    sort: "orderTime,asc",
  });

  return request<Page<ApiOrder>>(`/api/orders?${params.toString()}`);
}

export function getOrder(id: number) {
  return request<ApiOrder>(`/api/orders/${id}`);
}

export function markOrderReady(id: number) {
  return request<ApiOrder>(`/api/orders/${id}/ready`, { method: "PATCH" });
}

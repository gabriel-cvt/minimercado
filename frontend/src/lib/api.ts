import type { ApiOrderStatus, ApiPaymentStatus } from "@/websocket/websocket-types";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8080";

export type ApiPaymentMethod = "PIX" | "DINHEIRO" | "PENDING";

export interface ApiClient {
  id: number;
  name: string;
  cpf: string;
  phoneNumber?: string;
}

export interface ApiProduct {
  id: number;
  name: string;
  price: number;
  urlImage?: string;
  stockQuantity: number;
}

export interface ApiOrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ApiOrder {
  id: number;
  orderTime: string;
  readyAt: string | null;
  finishedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  status: ApiOrderStatus;
  paymentStatus: ApiPaymentStatus;
  items: ApiOrderItem[];
  client: ApiClient;
  paymentMethod: ApiPaymentMethod;
  totalValue: number;
}

export interface ApiDashboardSummary {
  ordersToday: number;
  revenueToday: number;
  pendingPayments: number;
  preparingOrders: number;
  readyForPickupOrders: number;
  finishedToday: number;
  cancelledToday: number;
  averagePreparationMinutes: number;
}

export interface ApiDashboardAnalytics {
  days: number;
  averagePreparationMinutes: number;
  averageTicket: number;
  paymentMethods: { paymentMethod: ApiPaymentMethod; ordersCount: number }[];
  ordersByHour: { hour: number; ordersCount: number }[];
  topClients: {
    clientId: number;
    name: string;
    cpf: string;
    ordersCount: number;
    totalSpent: number;
  }[];
  topProducts: {
    productId: number;
    name: string;
    quantitySold: number;
    totalValue: number;
  }[];
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

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
    throw new ApiError(response.status, message || `Erro ${response.status} ao acessar ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function getClientByCpf(cpf: string) {
  return request<ApiClient>(`/api/clients/cpf/${encodeURIComponent(cpf)}`);
}

export function createClient(data: { name: string; cpf: string; phoneNumber?: string }) {
  return request<ApiClient>("/api/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getProducts(
  params: {
    name?: string;
    inStock?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  } = {},
) {
  return request<Page<ApiProduct>>(
    `/api/products${queryString({ page: 0, size: 100, sort: "name,asc", ...params })}`,
  );
}

export function createProduct(data: {
  name: string;
  price: number;
  urlImage?: string;
  stockQuantity: number;
}) {
  return request<ApiProduct>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getProduct(id: number) {
  return request<ApiProduct>(`/api/products/${id}`);
}

export function updateProduct(
  id: number,
  data: {
    name?: string;
    price?: number;
    urlImage?: string;
  },
) {
  return request<ApiProduct>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateProductStock(id: number, quantityChange: number) {
  return request<ApiProduct>(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ quantityChange }),
  });
}

export function removeProduct(id: number) {
  return request<void>(`/api/products/${id}`, { method: "DELETE" });
}

export interface OrderFilters {
  status?: ApiOrderStatus;
  paymentStatus?: ApiPaymentStatus;
  clientCpf?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export function getOrders(params: OrderFilters = {}) {
  return request<Page<ApiOrder>>(
    `/api/orders${queryString({ page: 0, size: 100, sort: "orderTime,desc", ...params })}`,
  );
}

export function getKitchenPendingOrders() {
  return getOrders({
    status: "PENDING",
    page: 0,
    size: 50,
    sort: "orderTime,asc",
  });
}

export function getOrder(id: number) {
  return request<ApiOrder>(`/api/orders/${id}`);
}

export function createOrder(data: {
  items: { productId: number; quantity: number }[];
  clienteCpf: string;
  paymentMethod: ApiPaymentMethod;
}) {
  return request<ApiOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrder(
  id: number,
  data: {
    items: { productId: number; quantity: number }[];
    clienteCpf: string;
  },
) {
  return request<ApiOrder>(`/api/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function cancelOrder(id: number) {
  return request<ApiOrder>(`/api/orders/${id}/cancel`, { method: "PATCH" });
}

export function markOrderReady(id: number) {
  return request<ApiOrder>(`/api/orders/${id}/ready`, { method: "PATCH" });
}

export function finishOrder(id: number) {
  return request<ApiOrder>(`/api/orders/${id}/finish`, { method: "PATCH" });
}

export function markOrderPaid(id: number, paymentMethod: Exclude<ApiPaymentMethod, "PENDING">) {
  return request<ApiOrder>(`/api/orders/${id}/pay`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod }),
  });
}

export function getDashboardSummary() {
  return request<ApiDashboardSummary>("/api/dashboard/summary");
}

export function getDashboardAnalytics(days = 3) {
  return request<ApiDashboardAnalytics>(`/api/dashboard/analytics${queryString({ days })}`);
}

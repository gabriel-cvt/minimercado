import type { ApiOrderStatus, ApiPaymentStatus } from "@/websocket/websocket-types";

const LOCAL_API_URL = "http://localhost:8080";

function configuredApiUrl(value: string | undefined, variableName: string) {
  if (value?.trim()) return value.trim().replace(/\/+$/, "");
  if (import.meta.env.DEV) return LOCAL_API_URL;
  throw new Error(`${variableName} precisa ser definida em builds de produção.`);
}

const API_BASE_URL = configuredApiUrl(import.meta.env?.VITE_API_URL, "VITE_API_URL");

export const OPERATIONAL_KEY_STORAGE = "minimercado.operational-key.v1";

export function getOperationalKey() {
  return typeof window === "undefined"
    ? ""
    : (sessionStorage.getItem(OPERATIONAL_KEY_STORAGE) ?? "");
}

export function setOperationalKey(key: string) {
  if (typeof window === "undefined") return;
  if (key) sessionStorage.setItem(OPERATIONAL_KEY_STORAGE, key);
  else sessionStorage.removeItem(OPERATIONAL_KEY_STORAGE);
  window.dispatchEvent(new Event("operational-auth-changed"));
}

export type ApiPaymentMethod = "PIX" | "DINHEIRO" | "CARTAO";
export type ApiProductVariantSelectionMode = "SINGLE" | "MULTIPLE";
export type ApiProductIcon =
  | "GENERAL"
  | "SANDWICH"
  | "DRINK"
  | "DESSERT"
  | "SNACK"
  | "COMBO"
  | "MEAL"
  | "BAKERY"
  | "FROZEN_DESSERT"
  | "HOT_DRINK";

export interface ApiProductVariant {
  id: number;
  name: string;
  available: boolean;
}

export interface ApiProduct {
  id: number;
  name: string;
  price: number;
  icon: ApiProductIcon;
  available: boolean;
  hasVariants: boolean;
  variantType: string | null;
  variantSelectionRequired: boolean;
  variantSelectionMode: ApiProductVariantSelectionMode;
  variants: ApiProductVariant[];
}

export interface ApiOrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  selectedVariantId: number | null;
  selectedVariantName: string | null;
  selectedVariantIds?: number[];
  selectedVariantNames?: string[];
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
  paymentMethod: ApiPaymentMethod | null;
  customerName: string | null;
  customerPhoneNumber: string | null;
  customerTeam: string | null;
  totalValue: number;
  observation: string | null;
}

export type ApiPublicOrder = Pick<ApiOrder, "id" | "orderTime" | "readyAt" | "status">;

export interface ApiDashboardSummary {
  ordersToday: number;
  totalOrders: number;
  revenueToday: number;
  totalRevenue: number;
  pendingPayments: number;
  preparingOrders: number;
  readyForPickupOrders: number;
  finishedToday: number;
  cancelledToday: number;
  averagePreparationMinutes: number;
}

export interface ApiTopProduct {
  productId: number;
  name: string;
  quantitySold: number;
  totalValue: number;
}

export interface ApiDashboardAnalytics {
  averagePreparationMinutes: number;
  averageTicket: number;
  paymentMethods: { paymentMethod: ApiPaymentMethod; ordersCount: number }[];
  ordersByHour: { hour: number; ordersCount: number }[];
  statuses: { status: ApiOrderStatus; ordersCount: number }[];
  topProducts: ApiTopProduct[];
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
  const operationalKey = getOperationalKey();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(operationalKey ? { "X-Admin-Key": operationalKey } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const rawMessage = await response.text().catch(() => "");
    let message = rawMessage;
    try {
      const problem = JSON.parse(rawMessage) as { detail?: string; title?: string };
      message = problem.detail || problem.title || rawMessage;
    } catch {
      // Keep plain-text errors unchanged.
    }
    throw new ApiError(response.status, message || "Não foi possível concluir a solicitação.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function verifyOperationalAccess() {
  return request<{ authenticated: boolean }>("/api/auth/verify");
}

export interface ApiAppSettings {
  businessName: string;
  shortName: string;
  tagline: string;
  description: string;
  homeTitle: string;
  homeDescription: string;
  footerText: string;
  panelTitle: string;
  panelSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  preparingColor: string;
  readyColor: string;
  destructiveColor: string;
  borderRadius: number;
  fontFamily: "system" | "serif" | "rounded" | "mono";
  updatedAt: string;
}

export type AppSettingsWriteData = Omit<ApiAppSettings, "updatedAt">;

export function getPublicSettings() {
  return request<ApiAppSettings>("/api/settings/public");
}

export function updateAppSettings(data: AppSettingsWriteData) {
  return request<ApiAppSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function resetAppSettings() {
  return request<ApiAppSettings>("/api/settings/reset", {
    method: "POST",
  });
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function getProducts(
  params: {
    name?: string;
    available?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  } = {},
) {
  return request<Page<ApiProduct>>(
    `/api/products${queryString({ page: 0, size: 100, sort: "name,asc", ...params })}`,
  );
}

export interface ProductWriteData {
  name: string;
  price: number;
  icon: ApiProductIcon;
  available?: boolean;
  hasVariants: boolean;
  variantType?: string;
  variantSelectionRequired: boolean;
  variantSelectionMode: ApiProductVariantSelectionMode;
  variants: { id?: number; name: string; available: boolean }[];
}

export function createProduct(data: ProductWriteData) {
  return request<ApiProduct>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getProduct(id: number) {
  return request<ApiProduct>(`/api/products/${id}`);
}

export function updateProduct(id: number, data: ProductWriteData) {
  return request<ApiProduct>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateProductAvailability(id: number, available: boolean) {
  return request<ApiProduct>(`/api/products/${id}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ available }),
  });
}

export interface OrderFilters {
  status?: ApiOrderStatus;
  paymentStatus?: ApiPaymentStatus;
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
  return getAllOrders({
    status: "PENDING",
    sort: "orderTime,asc",
  });
}

export function getOrder(id: number) {
  return request<ApiOrder>(`/api/orders/${id}`);
}

export function createOrder(data: {
  items: {
    productId: number;
    quantity: number;
    selectedVariantId?: number;
    selectedVariantIds?: number[];
  }[];
  paymentMethod?: ApiPaymentMethod;
  confirmPayment?: boolean;
  customerName?: string;
  customerPhoneNumber?: string;
  customerTeam?: string;
  observation?: string;
}) {
  return request<ApiOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrder(
  id: number,
  data: {
    items: {
      productId: number;
      quantity: number;
      selectedVariantId?: number;
      selectedVariantIds?: number[];
    }[];
    paymentMethod?: ApiPaymentMethod;
    customerName?: string;
    customerPhoneNumber?: string;
    customerTeam?: string;
    observation?: string;
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

export function markOrderPaid(id: number, paymentMethod?: ApiPaymentMethod) {
  return request<ApiOrder>(`/api/orders/${id}/pay`, {
    method: "PATCH",
    body: paymentMethod ? JSON.stringify({ paymentMethod }) : undefined,
  });
}

export function getDashboardSummary() {
  return request<ApiDashboardSummary>("/api/dashboard/summary");
}

export function getDashboardAnalytics() {
  return request<ApiDashboardAnalytics>("/api/dashboard/analytics");
}

export function getDashboardTopProducts() {
  return request<ApiTopProduct[]>("/api/dashboard/top-products");
}

export async function getAllProducts(
  params: Omit<Parameters<typeof getProducts>[0], "page" | "size"> = {},
) {
  const pageSize = 200;
  const firstPage = await getProducts({ ...params, page: 0, size: pageSize });
  if (firstPage.totalPages <= 1) return firstPage.content;
  const remainingPages: Page<ApiProduct>[] = [];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    remainingPages.push(await getProducts({ ...params, page, size: pageSize }));
  }
  return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

export async function getAllOrders(params: Omit<OrderFilters, "page" | "size"> = {}) {
  const pageSize = 200;
  const firstPage = await getOrders({ ...params, page: 0, size: pageSize });
  if (firstPage.totalPages <= 1) return firstPage.content;
  const remainingPages: Page<ApiOrder>[] = [];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    remainingPages.push(await getOrders({ ...params, page, size: pageSize }));
  }
  return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

export async function getAllPublicOrders(
  params: Pick<OrderFilters, "status" | "sort"> & { status: "PENDING" | "READY_FOR_PICKUP" },
) {
  const pageSize = 200;
  const firstPage = await request<Page<ApiPublicOrder>>(
    `/api/orders/public${queryString({ ...params, page: 0, size: pageSize })}`,
  );
  const orders = [...firstPage.content];
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const next = await request<Page<ApiPublicOrder>>(
      `/api/orders/public${queryString({ ...params, page, size: pageSize })}`,
    );
    orders.push(...next.content);
  }
  return orders;
}

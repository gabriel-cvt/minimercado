import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  PackageCheck,
  RefreshCw,
  Signal,
  Soup,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getKitchenPendingOrders,
  getOrder,
  markOrderReady,
  type ApiOrder,
  type ApiOrderItem,
} from "@/lib/api";
import { formatBRL, formatTime } from "@/lib/format";
import {
  useKitchenOrdersSocket,
  useOrdersSocket,
  usePickupOrdersSocket,
  useWebSocketStatus,
} from "@/websocket/websocket-hooks";
import type {
  ApiOrderStatus,
  ConnectionStatus,
  KitchenOrderEvent,
  KitchenOrderItem,
  OrderRealtimeEvent,
} from "@/websocket/websocket-types";
import {
  clearSuppressedRealtimeToast,
  suppressNextRealtimeToast,
} from "@/websocket/websocket-events";

export const Route = createFileRoute("/cozinha")({
  head: () => ({ meta: [{ title: "Cozinha — Sistema de Pedidos" }] }),
  component: KitchenPage,
});

interface KitchenQueueItem {
  productId: number;
  productName: string;
  quantity: number;
  subtotal?: number;
  selectedVariantName?: string | null;
}

interface KitchenQueueOrder {
  id: number;
  customerName: string;
  createdAt: number;
  status: ApiOrderStatus;
  paymentStatus: string;
  totalValue?: number;
  items: KitchenQueueItem[];
  observation?: string | null;
  source: "api" | "websocket";
  lastUpdate: number;
}

type HighlightedOrder = {
  id: number;
  label: "Novo" | "Atualizado";
};

const connectionConfig: Record<
  ConnectionStatus,
  { label: string; Icon: typeof Wifi; className: string }
> = {
  idle: { label: "Aguardando", Icon: Signal, className: "bg-muted text-muted-foreground" },
  connecting: {
    label: "Conectando",
    Icon: Loader2,
    className: "bg-status-preparing/15 text-status-assembly",
  },
  connected: {
    label: "Ao vivo",
    Icon: Wifi,
    className: "bg-status-finished/15 text-status-finished",
  },
  reconnecting: {
    label: "Reconectando",
    Icon: Loader2,
    className: "bg-status-preparing/15 text-status-assembly",
  },
  disconnected: {
    label: "Sem conexão",
    Icon: WifiOff,
    className: "bg-muted text-muted-foreground",
  },
  error: { label: "Erro", Icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
};

function KitchenPage() {
  const [orders, setOrders] = useState<KitchenQueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("Aguardando pedidos");
  const [highlightedOrder, setHighlightedOrder] = useState<HighlightedOrder | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const { status } = useWebSocketStatus();

  const refreshOrders = useCallback(async () => {
    const pendingOrders = await getKitchenPendingOrders();
    setOrders(sortOrders(pendingOrders.map(mapApiOrder)));
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a fila da cozinha.");
    } finally {
      setLoading(false);
    }
  }, [refreshOrders]);

  const refillQueue = useCallback(() => {
    void refreshOrders().catch(() => {
      // Preserve realtime updates if an auxiliary refill request fails.
    });
  }, [refreshOrders]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    },
    [],
  );

  const highlight = useCallback((id: number, label: HighlightedOrder["label"]) => {
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    setHighlightedOrder({ id, label });
    highlightTimer.current = window.setTimeout(() => setHighlightedOrder(null), 4_000);
  }, []);

  const removeOrder = useCallback((orderId: number) => {
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }, []);

  const fetchAndUpsert = useCallback(
    async (orderId: number, fallback?: KitchenOrderEvent) => {
      try {
        const order = await getOrder(orderId);
        const mapped = mapApiOrder(order);
        if (mapped.status !== "PENDING") {
          removeOrder(orderId);
          return;
        }
        setOrders((current) => sortOrders(upsertOrder(current, mapped)));
      } catch {
        if (!fallback || fallback.type === "CANCELLED" || fallback.items.length === 0) return;
        setOrders((current) => sortOrders(upsertOrder(current, mapKitchenEvent(fallback))));
      }
    },
    [removeOrder],
  );

  const handleKitchenEvent = useCallback(
    (event: KitchenOrderEvent) => {
      setLastEvent(`Pedido #${event.orderId}: ${eventLabel(event.type)}`);
      if (event.type === "CANCELLED") {
        removeOrder(event.orderId);
        refillQueue();
        return;
      }
      highlight(event.orderId, event.type === "CREATED" ? "Novo" : "Atualizado");
      void fetchAndUpsert(event.orderId, event);
    },
    [fetchAndUpsert, highlight, refillQueue, removeOrder],
  );

  const handleOrderEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      if (!event.orderId) return;
      setLastEvent(`Pedido #${event.orderId}: ${eventLabel(event.type)}`);
      if (event.type === "ORDER_CANCELLED" || event.status === "CANCELLED") {
        removeOrder(event.orderId);
        return;
      }
      if (event.status && event.status !== "PENDING") {
        removeOrder(event.orderId);
        return;
      }
      if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") {
        highlight(event.orderId, event.type === "ORDER_CREATED" ? "Novo" : "Atualizado");
        void fetchAndUpsert(event.orderId);
      }
    },
    [fetchAndUpsert, highlight, removeOrder],
  );

  const handlePickupEvent = useCallback(
    (event: { orderId: number }) => {
      setLastEvent(`Pedido #${event.orderId}: pronto para retirada`);
      removeOrder(event.orderId);
      refillQueue();
    },
    [refillQueue, removeOrder],
  );

  useKitchenOrdersSocket(handleKitchenEvent);
  useOrdersSocket(handleOrderEvent);
  usePickupOrdersSocket(handlePickupEvent);

  const totals = (() => {
    const itemCount = orders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const oldest = orders[0]?.createdAt;
    return {
      orders: orders.length,
      items: itemCount,
      oldestMinutes: oldest ? Math.max(0, Math.floor((Date.now() - oldest) / 60_000)) : 0,
    };
  })();

  const handleReady = async (order: KitchenQueueOrder) => {
    setUpdatingId(order.id);
    try {
      suppressNextRealtimeToast(order.id, "pickup");
      await markOrderReady(order.id);
      removeOrder(order.id);
      refillQueue();
      toast.success(`Pedido #${order.id} pronto para retirada`, {
        description: "O pedido já aparece no painel de retirada.",
        duration: 2_800,
      });
    } catch (err) {
      clearSuppressedRealtimeToast(order.id, "pickup");
      toast.error(`Não foi possível marcar o pedido #${order.id} como pronto`, {
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        duration: Infinity,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const connection = connectionConfig[status];
  const ConnectionIcon = connection.Icon;

  return (
    <div className="min-h-[calc(100vh-78px)] bg-background">
      <section className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
                <ChefHat className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black uppercase ${connection.className}`}
                  >
                    <ConnectionIcon
                      className={`w-3.5 h-3.5 ${status === "connecting" || status === "reconnecting" ? "animate-spin" : ""}`}
                    />
                    {connection.label}
                  </span>
                  <span className="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-xs font-bold text-muted-foreground">
                    <Signal className="w-3.5 h-3.5" />
                    {lastEvent}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black leading-tight">Fila da Cozinha</h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Prepare os pedidos na ordem em que chegam.
                </p>
              </div>
            </div>

            <button
              onClick={() => void loadOrders()}
              disabled={loading}
              className="h-12 px-4 rounded-xl border-2 bg-card font-bold text-sm hover:border-primary/50 hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar fila
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <Metric label="Pedidos" value={totals.orders.toString()} />
            <Metric label="Itens" value={totals.items.toString()} />
            <Metric label="Mais antigo" value={`${totals.oldestMinutes} min`} />
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {error && orders.length > 0 && (
          <div className="mb-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
            <XCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-black">Fila indisponível</p>
              <p className="text-sm font-medium opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-72 rounded-2xl border bg-card shadow-card animate-pulse"
              />
            ))}
          </div>
        ) : error && orders.length === 0 ? (
          <div className="min-h-[48vh] rounded-3xl border border-destructive/20 bg-card shadow-card flex items-center justify-center px-6 text-center">
            <div>
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black">Fila indisponível</h2>
              <p className="text-muted-foreground font-medium mt-2 max-w-md">{error}</p>
              <button
                onClick={() => void loadOrders()}
                className="mt-5 h-12 px-4 rounded-xl bg-gradient-primary text-primary-foreground font-black shadow-elegant inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="min-h-[48vh] rounded-3xl border bg-card shadow-card flex items-center justify-center px-6 text-center">
            <div>
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-status-finished/15 flex items-center justify-center">
                <PackageCheck className="w-10 h-10 text-status-finished" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black">Fila limpa</h2>
              <p className="text-muted-foreground font-medium mt-2">
                Novos pedidos aparecerão aqui assim que chegarem na cozinha.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            <AnimatePresence initial={false}>
              {orders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  busy={updatingId === order.id}
                  highlight={highlightedOrder?.id === order.id ? highlightedOrder.label : undefined}
                  onReady={() => void handleReady(order)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function KitchenOrderCard({
  order,
  busy,
  highlight,
  onReady,
}: {
  order: KitchenQueueOrder;
  busy: boolean;
  highlight?: HighlightedOrder["label"];
  onReady: () => void;
}) {
  const elapsedMs = Date.now() - order.createdAt;
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60_000));
  const isLate = elapsedMin >= 12;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`rounded-2xl border bg-card shadow-card overflow-hidden transition-shadow ${highlight ? "ring-2 ring-primary shadow-elegant" : ""} ${isLate ? "border-destructive/30" : ""}`}
    >
      <div className="p-5 border-b bg-muted/35">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Pedido
              </p>
              {highlight && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                  {highlight}
                </span>
              )}
            </div>
            <h2 className="text-4xl font-black tabular-nums">#{order.id}</h2>
            <p className="text-sm font-semibold text-muted-foreground truncate max-w-[15rem]">
              {order.customerName}
            </p>
          </div>
          <div
            className={`h-12 min-w-20 rounded-xl flex flex-col items-center justify-center px-3 ${isLate ? "bg-destructive/10 text-destructive" : "bg-status-preparing/15 text-status-assembly"}`}
          >
            <span className="text-lg font-black tabular-nums">{elapsedMin}</span>
            <span className="text-[10px] font-black uppercase">min</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(order.createdAt)}
          </span>
          <span className="text-right">{paymentStatusLabel(order.paymentStatus)}</span>
        </div>
      </div>

      <div className="p-5 space-y-2">
        {order.items.map((item) => (
          <div
            key={`${order.id}-${item.productId}-${item.selectedVariantName ?? "base"}`}
            className="min-h-16 rounded-xl bg-muted/45 p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-card shadow-sm flex items-center justify-center">
              <Soup className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">{item.productName}</p>
              {item.selectedVariantName && (
                <p className="text-xs font-black text-primary">{item.selectedVariantName}</p>
              )}
              {item.subtotal !== undefined && (
                <p className="text-xs text-muted-foreground font-semibold">
                  {formatBRL(item.subtotal)}
                </p>
              )}
            </div>
            <span className="w-12 h-10 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center tabular-nums">
              x{item.quantity}
            </span>
          </div>
        ))}
        {order.observation && (
          <div className="rounded-xl border border-status-preparing/30 bg-status-preparing/10 p-3">
            <p className="text-[10px] uppercase font-black text-status-assembly">Observação</p>
            <p className="text-sm font-bold mt-1">{order.observation}</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onReady}
          disabled={busy}
          className="w-full h-12 rounded-xl bg-status-finished text-white font-black shadow-elegant hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          Marcar como pronto
        </button>
      </div>
    </motion.article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-card">
      <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl md:text-3xl font-black tabular-nums mt-1">{value}</p>
    </div>
  );
}

function mapApiOrder(order: ApiOrder): KitchenQueueOrder {
  return {
    id: order.id,
    customerName: order.customerName || `Pedido #${order.id}`,
    createdAt: new Date(order.orderTime).getTime(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalValue: order.totalValue,
    items: order.items.map(mapApiItem),
    observation: order.observation,
    source: "api",
    lastUpdate: Date.now(),
  };
}

function mapApiItem(item: ApiOrderItem): KitchenQueueItem {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    subtotal: item.subtotal,
    selectedVariantName: item.selectedVariantName,
  };
}

function mapKitchenEvent(event: KitchenOrderEvent): KitchenQueueOrder {
  return {
    id: event.orderId,
    customerName: "Pedido recebido",
    createdAt: Date.now(),
    status: "PENDING",
    paymentStatus: "PENDING",
    items: event.items.map(mapEventItem),
    observation: event.observation,
    source: "websocket",
    lastUpdate: Date.now(),
  };
}

function mapEventItem(item: KitchenOrderItem): KitchenQueueItem {
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    selectedVariantName: item.selectedVariantName,
  };
}

function upsertOrder(current: KitchenQueueOrder[], next: KitchenQueueOrder) {
  const exists = current.some((order) => order.id === next.id);
  if (!exists) return [next, ...current];
  return current.map((order) => (order.id === next.id ? { ...order, ...next } : order));
}

function sortOrders(orders: KitchenQueueOrder[]) {
  return [...orders].sort((a, b) => a.createdAt - b.createdAt);
}

function paymentStatusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "CANCELLED") return "Cancelado";
  return "Pagamento pendente";
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    CREATED: "recebido",
    UPDATED: "atualizado",
    CANCELLED: "cancelado",
    ORDER_CREATED: "criado",
    ORDER_UPDATED: "atualizado",
    ORDER_STATUS_CHANGED: "status alterado",
    ORDER_PAID: "pago",
    ORDER_CANCELLED: "cancelado",
  };

  return labels[type] ?? type;
}

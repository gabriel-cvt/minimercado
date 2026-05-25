import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Clock, Flame, CheckCircle2, Package, ChefHat, XCircle } from "lucide-react";
import { finishOrder, getOrder, getOrders, type ApiOrder } from "@/lib/api";
import { formatBRL, formatTime } from "@/lib/format";
import type { ApiOrderStatus, OrderRealtimeEvent } from "@/websocket/websocket-types";
import { useOrdersSocket } from "@/websocket/websocket-hooks";

const statusConfig: Record<
  ApiOrderStatus,
  { label: string; color: string; bg: string; Icon: typeof Flame }
> = {
  PENDING: {
    label: "Em preparo",
    color: "text-status-preparing",
    bg: "bg-status-preparing/15",
    Icon: Flame,
  },
  READY_FOR_PICKUP: {
    label: "Pronto",
    color: "text-status-assembly",
    bg: "bg-status-assembly/15",
    Icon: Package,
  },
  FINISHED: {
    label: "Finalizado",
    color: "text-status-finished",
    bg: "bg-status-finished/15",
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-destructive",
    bg: "bg-destructive/15",
    Icon: XCircle,
  },
};

export function OrderDetails() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [, force] = useState(0);
  const ordersQuery = useQuery({
    queryKey: ["orders", "details"],
    queryFn: () => getOrders({ size: 100, sort: "orderTime,desc" }),
  });
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);
  const detailQuery = useQuery({
    queryKey: ["orders", "detail", selectedId],
    queryFn: () => getOrder(selectedId!),
    enabled: selectedId !== null,
  });

  useEffect(() => {
    const timer = setInterval(() => force((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedId === null && orders[0]) setSelectedId(orders[0].id);
  }, [orders, selectedId]);

  const refreshForEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (event.orderId === selectedId) {
        void queryClient.invalidateQueries({ queryKey: ["orders", "detail", selectedId] });
      }
    },
    [queryClient, selectedId],
  );
  useOrdersSocket(refreshForEvent);

  const finishMutation = useMutation({
    mutationFn: finishOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(["orders", "detail", order.id], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmFinish(false);
    },
  });

  const selected = detailQuery.data ?? orders.find((order) => order.id === selectedId);
  const active = orders.filter(
    (order) => order.status === "PENDING" || order.status === "READY_FOR_PICKUP",
  );
  const closed = orders.filter(
    (order) => order.status === "FINISHED" || order.status === "CANCELLED",
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <ClipboardList className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Detalhamento de Pedidos</h2>
          <p className="text-muted-foreground">
            Visão operacional ao vivo - {active.length} na fila
          </p>
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-muted-foreground">
          Carregando pedidos...
        </div>
      ) : ordersQuery.isError ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-destructive">
          Não foi possível carregar os pedidos.
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-3xl border p-16 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold mb-1">Nenhum pedido ainda</p>
          <p className="text-muted-foreground">
            Crie um pedido na aba de realização para visualizá-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-3 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {[...active, ...closed].map((order) => (
                <OrderListButton
                  key={order.id}
                  order={order}
                  selected={order.id === selectedId}
                  onClick={() => setSelectedId(order.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl shadow-card border p-6 md:p-8 lg:max-h-[calc(100vh-260px)] overflow-y-auto"
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <p className="text-muted-foreground text-sm font-semibold">Pedido</p>
                  <h2 className="text-4xl font-black">#{selected.id}</h2>
                  <p className="text-muted-foreground mt-1">
                    {selected.client.name} · {formatTime(selected.orderTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Total
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {formatBRL(selected.totalValue)}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">
                    {paymentLabel(selected.paymentMethod)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {selected.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{item.productName}</p>
                    </div>
                    <span className="bg-primary/10 text-primary font-black px-3 py-1 rounded-lg">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {selected.status === "READY_FOR_PICKUP" ? (
                <button
                  onClick={() => setConfirmFinish(true)}
                  className="w-full bg-status-finished text-white font-bold py-4 rounded-xl shadow-elegant hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Finalizar retirada
                </button>
              ) : (
                <StatusNotice status={selected.status} />
              )}
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmFinish && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmFinish(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-sm p-6 text-center"
            >
              <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-status-finished" />
              <h3 className="text-xl font-black mb-2">Finalizar pedido #{selected.id}?</h3>
              <p className="text-muted-foreground text-sm mb-5">
                O pedido será encerrado após a retirada.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmFinish(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => finishMutation.mutate(selected.id)}
                  disabled={finishMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-status-finished text-white font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
              {finishMutation.isError && (
                <p className="mt-3 text-sm text-destructive">
                  Não foi possível finalizar o pedido.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderListButton({
  order,
  selected,
  onClick,
}: {
  order: ApiOrder;
  selected: boolean;
  onClick: () => void;
}) {
  const config = statusConfig[order.status];
  const Icon = config.Icon;
  const elapsed = Math.floor((Date.now() - new Date(order.orderTime).getTime()) / 1000);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selected ? "border-primary bg-card shadow-elegant" : "border-border bg-card hover:border-primary/40"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-black text-xl">#{order.id}</span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}
        >
          <Icon className="w-3 h-3" /> {config.label}
        </span>
      </div>
      <p className="font-semibold text-sm truncate">{order.client.name}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {fmtElapsed(elapsed)}
        </span>
        <span>
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} itens ·{" "}
          <strong className="text-foreground">{formatBRL(order.totalValue)}</strong>
        </span>
      </div>
    </motion.button>
  );
}

function StatusNotice({ status }: { status: ApiOrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.Icon;
  return (
    <div
      className={`w-full ${config.bg} ${config.color} font-bold py-4 rounded-xl flex items-center justify-center gap-2`}
    >
      <Icon className="w-5 h-5" /> {config.label}
    </div>
  );
}

function fmtElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function paymentLabel(paymentMethod: string) {
  return paymentMethod === "PIX" ? "PIX" : paymentMethod === "DINHEIRO" ? "Dinheiro" : "Pendente";
}

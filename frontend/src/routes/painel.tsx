import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle2 } from "lucide-react";
import { getAllPublicOrders, type ApiPublicOrder } from "@/lib/api";
import { usePublicOrdersSocket } from "@/websocket/websocket-hooks";
import type { OrderRealtimeEvent } from "@/websocket/websocket-types";
import { useBranding } from "@/branding/branding";
import { BrandLogo } from "@/branding/BrandLogo";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Painel de Pedidos — Sistema de Pedidos" }] }),
  component: DisplayPage,
});

const PUBLIC_ORDERS_QUERY_KEY = ["orders", "public"] as const;

async function getDisplayOrders() {
  const [preparing, ready] = await Promise.all([
    getAllPublicOrders({ status: "PENDING", sort: "orderTime,asc" }),
    getAllPublicOrders({ status: "READY_FOR_PICKUP", sort: "readyAt,desc" }),
  ]);
  return { preparing, ready };
}

function DisplayPage() {
  const branding = useBranding();
  const queryClient = useQueryClient();
  const [time, setTime] = useState(new Date());
  const ordersQuery = useQuery({
    queryKey: PUBLIC_ORDERS_QUERY_KEY,
    queryFn: getDisplayOrders,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePublicOrderEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof getDisplayOrders>>>(
        PUBLIC_ORDERS_QUERY_KEY,
        (current) => {
          if (!current || !event.orderId) return current;

          return {
            preparing:
              event.status && event.status !== "PENDING"
                ? current.preparing.filter((order) => order.id !== event.orderId)
                : current.preparing,
            ready:
              event.status && event.status !== "READY_FOR_PICKUP"
                ? current.ready.filter((order) => order.id !== event.orderId)
                : current.ready,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: PUBLIC_ORDERS_QUERY_KEY });
    },
    [queryClient],
  );
  usePublicOrdersSocket(handlePublicOrderEvent);

  const preparing = (ordersQuery.data?.preparing ?? []).filter(
    (order) => order.status === "PENDING",
  );
  const ready = (ordersQuery.data?.ready ?? []).filter(
    (order) =>
      order.status === "READY_FOR_PICKUP" &&
      order.readyAt !== null &&
      time.getTime() - new Date(order.readyAt).getTime() < 300_000,
  );

  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo compact inverse />
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              {branding.panelTitle}
            </h1>
            <p className="text-background/60 font-medium">{branding.panelSubtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl md:text-5xl font-black tabular-nums">
            {time.toLocaleTimeString("pt-BR").slice(0, 5)}
          </p>
          <p className="text-sm text-background/60">
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </header>

      {ordersQuery.isError && (
        <p className="p-6 text-center text-red-300 font-semibold">
          Não foi possível atualizar o painel.
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-px bg-background/10 min-h-[calc(100vh-110px)]">
        <Column
          title="Em preparo"
          tone="preparing"
          orders={preparing}
          icon={<Flame className="w-8 h-8" />}
        />
        <Column
          title="Pronto"
          tone="ready"
          orders={ready}
          icon={<CheckCircle2 className="w-8 h-8" />}
        />
      </div>
    </div>
  );
}

function Column({
  title,
  tone,
  orders,
  icon,
}: {
  title: string;
  tone: "preparing" | "ready";
  orders: ApiPublicOrder[];
  icon: React.ReactNode;
}) {
  const isReady = tone === "ready";
  return (
    <section className={`p-8 ${isReady ? "bg-status-finished/10" : "bg-status-preparing/10"}`}>
      <div
        className={`flex items-center gap-3 mb-6 pb-4 border-b ${isReady ? "border-status-finished/30 text-status-finished" : "border-status-preparing/30 text-status-preparing"}`}
      >
        {icon}
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{title}</h2>
        <span className="ml-auto text-2xl font-black opacity-60">{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <div className="text-background/30 text-center py-20 font-bold text-xl">Nenhum pedido</div>
      ) : (
        <div
          className={`grid ${isReady ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}
        >
          <AnimatePresence>
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 20 }}
                className={`aspect-[4/3] rounded-3xl flex items-center justify-center font-black ${isReady ? "bg-gradient-to-br from-status-finished to-chart-2 text-background shadow-glow animate-pulse-ready" : "bg-gradient-to-br from-status-preparing to-secondary text-foreground"}`}
              >
                <span className="text-4xl md:text-6xl tabular-nums">#{order.id}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

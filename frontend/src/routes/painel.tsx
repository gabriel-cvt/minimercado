import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle2 } from "lucide-react";
import { getOrders, type ApiOrder } from "@/lib/api";
import { usePublicOrdersSocket } from "@/websocket/websocket-hooks";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Painel de Pedidos - McDomine's" }] }),
  component: DisplayPage,
});

const DISPLAY_PAGE_SIZE = 500;

async function getDisplayOrders() {
  const [preparing, ready] = await Promise.all([
    getOrders({ status: "PENDING", size: DISPLAY_PAGE_SIZE, sort: "orderTime,asc" }),
    getOrders({ status: "READY_FOR_PICKUP", size: DISPLAY_PAGE_SIZE, sort: "readyAt,desc" }),
  ]);
  return { preparing: preparing.content, ready: ready.content };
}

function DisplayPage() {
  const queryClient = useQueryClient();
  const [time, setTime] = useState(new Date());
  const ordersQuery = useQuery({ queryKey: ["orders", "public"], queryFn: getDisplayOrders });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders", "public"] });
  }, [queryClient]);
  usePublicOrdersSocket(refresh);

  const preparing = ordersQuery.data?.preparing ?? [];
  const ready = (ordersQuery.data?.ready ?? []).filter(
    (order) =>
      order.readyAt === null || time.getTime() - new Date(order.readyAt).getTime() < 300_000,
  );

  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-yellow flex items-center justify-center shadow-glow">
            <span className="text-4xl font-black text-primary leading-none">M</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Painel de Pedidos McDomine's
            </h1>
            <p className="text-white/60 font-medium">Veja quando seu pedido estiver pronto</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl md:text-5xl font-black tabular-nums">
            {time.toLocaleTimeString("pt-BR").slice(0, 5)}
          </p>
          <p className="text-sm text-white/60">
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </header>

      {ordersQuery.isError && (
        <p className="p-6 text-center text-red-300 font-semibold">
          Não foi possível atualizar o painel.
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-px bg-white/10 min-h-[calc(100vh-110px)]">
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
  orders: ApiOrder[];
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
        <div className="text-white/30 text-center py-20 font-bold text-xl">Nenhum pedido</div>
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
                className={`aspect-[4/3] rounded-3xl flex items-center justify-center font-black ${isReady ? "bg-gradient-to-br from-status-finished to-emerald-600 text-white shadow-glow animate-pulse-ready" : "bg-gradient-to-br from-status-preparing to-amber-500 text-foreground"}`}
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Painel de Pedidos — McDominus" }] }),
  component: DisplayPage,
});

function DisplayPage() {
  const orders = useStore((s) => s.orders);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const preparing = orders.filter((o) => o.status !== "finished");
  const ready = orders.filter((o) => o.status === "finished" && o.finishedAt && Date.now() - o.finishedAt < 5 * 60_000);

  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-yellow flex items-center justify-center shadow-glow">
            <span className="text-4xl font-black text-primary leading-none">M</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Painel de Pedidos McDominus</h1>
            <p className="text-white/60 font-medium">Acompanhe seu pedido em tempo real</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl md:text-5xl font-black tabular-nums">{time.toLocaleTimeString("pt-BR").slice(0, 5)}</p>
          <p className="text-sm text-white/60">{time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-px bg-white/10 min-h-[calc(100vh-110px)]">
        <Column title="Em preparo" tone="preparing" orders={preparing} icon={<Flame className="w-8 h-8" />} />
        <Column title="Pronto" tone="ready" orders={ready} icon={<CheckCircle2 className="w-8 h-8" />} />
      </div>
    </div>
  );
}

function Column({ title, tone, orders, icon }: { title: string; tone: "preparing" | "ready"; orders: { id: string; number: number }[]; icon: React.ReactNode }) {
  const isReady = tone === "ready";
  return (
    <section className={`p-8 ${isReady ? "bg-status-finished/10" : "bg-status-preparing/10"}`}>
      <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${isReady ? "border-status-finished/30 text-status-finished" : "border-status-preparing/30 text-status-preparing"}`}>
        {icon}
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{title}</h2>
        <span className="ml-auto text-2xl font-black opacity-60">{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <div className="text-white/30 text-center py-20 font-bold text-xl">Nenhum pedido</div>
      ) : (
        <div className={`grid ${isReady ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
          <AnimatePresence>
            {orders.map((o) => (
              <motion.div key={o.id} layout
                initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 20 }}
                className={`aspect-[4/3] rounded-3xl flex items-center justify-center font-black ${isReady ? "bg-gradient-to-br from-status-finished to-emerald-600 text-white shadow-glow animate-pulse-ready" : "bg-gradient-to-br from-status-preparing to-amber-500 text-foreground"}`}>
                <span className="text-4xl md:text-6xl tabular-nums">#{o.number}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Clock, Flame, CheckCircle2, X, Package, ChefHat, Coffee, IceCream, Utensils } from "lucide-react";
import { useStore, formatBRL } from "@/lib/store";
import type { KitchenName, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/manage")({ component: ManagePage });

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; Icon: typeof Flame }> = {
  preparing: { label: "Preparing", color: "text-status-preparing", bg: "bg-status-preparing/15", Icon: Flame },
  assembly: { label: "Awaiting Assembly", color: "text-status-assembly", bg: "bg-status-assembly/15", Icon: Package },
  finished: { label: "Finished", color: "text-status-finished", bg: "bg-status-finished/15", Icon: CheckCircle2 },
};

const kitchenIcons: Record<KitchenName, typeof Flame> = {
  Sandwiches: ChefHat, Drinks: Coffee, Desserts: IceCream, General: Utensils,
};

function ManagePage() {
  const { orders, setOrderStatus } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [, force] = useState(0);

  // tick for live elapsed times
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!selectedId && orders[0]) setSelectedId(orders[0].id);
  }, [orders, selectedId]);

  const selected = orders.find((o) => o.id === selectedId);
  const active = orders.filter((o) => o.status !== "finished");
  const finished = orders.filter((o) => o.status === "finished");

  const handleFinish = () => {
    if (!selected) return;
    setOrderStatus(selected.id, "finished");
    setConfirmFinish(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <ClipboardList className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black">Order Details</h1>
          <p className="text-muted-foreground">Live operational view — {active.length} in queue</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card rounded-3xl border p-16 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold mb-1">No orders yet</p>
          <p className="text-muted-foreground">Place an order from the Orders tab to see it here.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {[...active, ...finished].map((o) => {
                const cfg = statusConfig[o.status];
                const Icon = cfg.Icon;
                const isSelected = o.id === selectedId;
                const elapsed = Math.floor((Date.now() - o.createdAt) / 1000);
                return (
                  <motion.button key={o.id} layout
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    onClick={() => setSelectedId(o.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? "border-primary bg-card shadow-elegant" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xl">#{o.number}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">{o.customerName}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtElapsed(elapsed)}</span>
                      <span>{o.items.reduce((s, i) => s + i.quantity, 0)} items · <span className="font-bold text-foreground">{formatBRL(o.total)}</span></span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl shadow-card border p-6 md:p-8 lg:max-h-[calc(100vh-220px)] overflow-y-auto">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <p className="text-muted-foreground text-sm font-semibold">Order</p>
                  <h2 className="text-4xl font-black">#{selected.number}</h2>
                  <p className="text-muted-foreground mt-1">{selected.customerName} · {new Date(selected.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Total</p>
                  <p className="text-3xl font-black text-primary">{formatBRL(selected.total)}</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">{selected.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {selected.items.map((it, i) => {
                  const KIcon = kitchenIcons[it.kitchen];
                  return (
                    <div key={i} className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                        <KIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{it.name}</p>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{it.kitchen}</span>
                      </div>
                      <span className="bg-primary/10 text-primary font-black px-3 py-1 rounded-lg">×{it.quantity}</span>
                    </div>
                  );
                })}
              </div>

              {selected.status !== "finished" ? (
                <button onClick={() => setConfirmFinish(true)}
                  className="w-full bg-status-finished text-white font-bold py-4 rounded-xl shadow-elegant hover:scale-[1.01] transition-transform flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Order Assembled
                </button>
              ) : (
                <div className="w-full bg-status-finished/15 text-status-finished font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Finished at {selected.finishedAt && new Date(selected.finishedAt).toLocaleTimeString()}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmFinish && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setConfirmFinish(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl shadow-elegant max-w-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-finished/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-status-finished" />
              </div>
              <h3 className="text-xl font-black mb-2">Finalize order #{selected.number}?</h3>
              <p className="text-muted-foreground text-sm mb-5">It will be marked Finished and shown as Ready on the display panel.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmFinish(false)} className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted">Cancel</button>
                <button onClick={handleFinish} className="flex-1 py-3 rounded-xl bg-status-finished text-white font-bold">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fmtElapsed(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

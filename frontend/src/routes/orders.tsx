import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, ClipboardList } from "lucide-react";
import { OrdersFlow } from "@/components/mcd/OrdersFlow";
import { OrderDetails } from "@/components/mcd/OrderDetails";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Pedidos — McDominus" }] }),
  component: OrdersPage,
});

const tabs = [
  { id: "flow", label: "Realização de Pedidos", icon: ShoppingBag },
  { id: "details", label: "Detalhamento de Pedidos", icon: ClipboardList },
] as const;

type TabId = (typeof tabs)[number]["id"];

function OrdersPage() {
  const [tab, setTab] = useState<TabId>("flow");
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="bg-card rounded-2xl border shadow-card p-1.5 inline-flex flex-wrap gap-1 mb-6 max-w-full overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {active && (
                <motion.div
                  layoutId="orders-tab"
                  className="absolute inset-0 bg-gradient-primary rounded-xl shadow-elegant"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}
              <Icon className="relative z-10 w-4 h-4" />
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "flow" && <OrdersFlow />}
        {tab === "details" && <OrderDetails />}
      </motion.div>
    </div>
  );
}

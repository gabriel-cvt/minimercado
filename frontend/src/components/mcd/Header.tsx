import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, BarChart3, Tv, Menu, X, ChefHat, Package } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { to: "/", label: "Início", icon: Home },
  { to: "/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/cozinha", label: "Cozinha", icon: ChefHat },
  { to: "/dashboard", label: "Resultados", icon: BarChart3 },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-card border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-[78px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-yellow flex items-center justify-center shadow-elegant group-hover:scale-105 transition-transform">
            <span className="text-3xl font-black text-primary leading-none">M</span>
          </div>
          <div className="leading-tight">
            <div className="text-lg md:text-xl font-black tracking-tight text-foreground">
              McDomine's
            </div>
            <div className="text-[11px] text-muted-foreground font-medium hidden sm:block">
              Sistema de Pedidos
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map((t) => {
            const active = path === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="relative px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className={active ? "text-primary" : "text-foreground/80"}>{t.label}</span>
                {active && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute -bottom-[19px] left-3 right-3 h-[3px] bg-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
          <Link
            to="/painel"
            className="ml-3 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:bg-foreground/90 transition-colors"
          >
            <Tv className="w-4 h-4" /> Painel de Pedidos
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t bg-white"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = path === t.to;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    onClick={() => setOpen(false)}
                    className={`px-4 py-3 rounded-xl flex items-center gap-3 font-semibold ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Icon className="w-5 h-5" /> {t.label}
                  </Link>
                );
              })}
              <Link
                to="/painel"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl flex items-center gap-3 font-semibold bg-foreground text-background"
              >
                <Tv className="w-5 h-5" /> Painel de Pedidos
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Tv,
  ShoppingBag,
  ChefHat,
  BarChart3,
  MonitorPlay,
  Zap,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { getDashboardSummary, getOrders } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useOrdersSocket } from "@/websocket/websocket-hooks";
import { useBranding } from "@/branding/branding";
import { BrandLogo } from "@/branding/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Sistema de Pedidos" },
      {
        name: "description",
        content: "Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.",
      },
      { property: "og:title", content: "Sistema de Pedidos" },
      {
        property: "og:description",
        content: "Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.",
      },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const branding = useBranding();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
  });
  const pendingQuery = useQuery({
    queryKey: ["orders", "home", "pending"],
    queryFn: () => getOrders({ status: "PENDING", size: 3, sort: "orderTime,asc" }),
  });
  const readyQuery = useQuery({
    queryKey: ["orders", "home", "ready"],
    queryFn: () => getOrders({ status: "READY_FOR_PICKUP", size: 1, sort: "orderTime,desc" }),
  });
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders", "home"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);
  useOrdersSocket(refresh);

  const summary = summaryQuery.data;
  const pending = pendingQuery.data?.content ?? [];
  const latestReady = readyQuery.data?.content[0];
  const revenue = summary?.revenueToday ?? 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-accent-yellow blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] rounded-full bg-primary-glow blur-3xl animate-pulse" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-28 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/15 backdrop-blur text-sm font-semibold mb-6"
            >
              <Zap className="w-4 h-4 text-accent-yellow" /> Pedidos · Cozinha · Retirada
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black leading-[1.02] mb-6"
            >
              {branding.homeTitle}
              <br />
              <span className="text-accent-yellow">{branding.businessName}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-primary-foreground/90 mb-8 font-medium max-w-xl"
            >
              {branding.homeDescription}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/orders"
                className="bg-card text-primary font-bold px-6 py-4 rounded-xl shadow-elegant hover:scale-[1.03] transition-transform flex items-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" /> Fazer pedido <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/painel"
                className="bg-foreground/30 backdrop-blur text-primary-foreground font-bold px-6 py-4 rounded-xl border border-primary-foreground/20 hover:bg-foreground/50 transition-colors flex items-center gap-2"
              >
                <Tv className="w-5 h-5" /> Ver Painel
              </Link>
            </motion.div>
          </div>

          {/* Floating cards */}
          <div className="relative h-[420px] hidden lg:block">
            <FloatingCard delay={0} className="top-0 left-8 w-64" tilt={-6}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-status-preparing/20 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-status-preparing" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Em preparo
                  </p>
                  <p className="text-2xl font-black text-foreground">
                    {summary?.preparingOrders ?? 0}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {pending.slice(0, 3).map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between text-xs font-semibold text-foreground/80"
                  >
                    <span>#{o.id}</span>
                    <span>{o.customerName?.split(" ")[0] ?? `#${o.id}`}</span>
                  </div>
                ))}
              </div>
            </FloatingCard>
            <FloatingCard delay={0.4} className="top-32 right-0 w-72" tilt={4}>
              <div className="flex items-center gap-3 mb-3">
                <BrandLogo compact />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Faturamento hoje
                  </p>
                  <p className="text-2xl font-black text-foreground">{formatBRL(revenue)}</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary w-3/4" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                {summary?.finishedToday ?? 0} pedidos finalizados
              </p>
            </FloatingCard>
            <FloatingCard delay={0.7} className="bottom-0 left-20 w-72" tilt={-3}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-status-finished/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-status-finished" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {latestReady ? `Pedido #${latestReady.id} pronto!` : "Nenhum pedido pronto"}
                  </p>
                  <p className="text-xs text-muted-foreground">Disponível para retirada</p>
                </div>
              </div>
            </FloatingCard>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Pedidos hoje"
            value={(summary?.ordersToday ?? 0).toString()}
            tone="primary"
          />
          <StatCard
            icon={Clock}
            label="Pendentes"
            value={(summary?.preparingOrders ?? 0).toString()}
            tone="warning"
          />
          <StatCard
            icon={CheckCircle2}
            label="Finalizados"
            value={(summary?.finishedToday ?? 0).toString()}
            tone="success"
          />
          <StatCard
            icon={DollarSign}
            label="Faturamento"
            value={formatBRL(revenue)}
            tone="primary"
          />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-primary font-bold uppercase tracking-wider text-sm mb-2">
            Recursos do sistema
          </p>
          <h2 className="text-4xl md:text-5xl font-black">Tudo o que sua operação precisa</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            Icon={ShoppingBag}
            title="Gestão de Pedidos"
            desc="Registre pedidos rapidamente direto pelo cardápio disponível."
          />
          <FeatureCard
            Icon={Zap}
            title="Informações Atualizadas"
            desc="Pedidos novos e prontos aparecem para a equipe acompanhar."
          />
          <FeatureCard
            Icon={ChefHat}
            title="Controle da Cozinha"
            desc="Os pedidos chegam à fila de preparo da cozinha."
          />
          <FeatureCard
            Icon={BarChart3}
            title="Painel de Resultados"
            desc="Veja quantidades, vendas e pagamentos de forma organizada."
          />
          <FeatureCard
            Icon={MonitorPlay}
            title="Painel de Retirada"
            desc="Tela pública com pedidos em preparo e prontos para retirada."
          />
          <FeatureCard
            Icon={TrendingUp}
            title="Resumo das Vendas"
            desc="Acompanhe pedidos, produtos mais vendidos e faturamento."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
        <div className="bg-gradient-primary rounded-3xl p-10 md:p-14 text-center text-primary-foreground shadow-elegant relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-yellow/30 blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl md:text-5xl font-black mb-4">Pronto para começar?</h3>
            <p className="text-lg text-primary-foreground/90 mb-6 max-w-xl mx-auto">
              Comece a registrar e acompanhar pedidos agora mesmo.
            </p>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 bg-card text-primary font-bold px-8 py-4 rounded-xl shadow-elegant hover:scale-[1.03] transition-transform"
            >
              <ShoppingBag className="w-5 h-5" /> Fazer pedido
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-foreground text-background/80">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo compact inverse />
            <div>
              <p className="font-black text-background">{branding.businessName}</p>
              <p className="text-xs">{branding.tagline}</p>
            </div>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} {branding.businessName}. {branding.footerText}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FloatingCard({
  children,
  className = "",
  delay = 0,
  tilt = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  tilt?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: tilt }}
      animate={{ opacity: 1, y: [30, 0, 8, 0], rotate: tilt }}
      transition={{ delay, duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      className={`absolute bg-card text-foreground rounded-2xl p-4 shadow-elegant border ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: "primary" | "warning" | "success";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary bg-primary/10"
      : tone === "warning"
        ? "text-status-preparing bg-status-preparing/15"
        : "text-status-finished bg-status-finished/15";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl shadow-card border p-5"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${toneClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-black">{value}</p>
    </motion.div>
  );
}

function FeatureCard({ Icon, title, desc }: { Icon: typeof Clock; title: string; desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="bg-card rounded-2xl border p-6 shadow-card hover:shadow-elegant transition-shadow group"
    >
      <div className="w-12 h-12 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-black mb-2">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

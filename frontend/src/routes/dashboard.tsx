import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Clock, CheckCircle2, DollarSign, Wallet, Users, ChefHat, Flame, Package,
  TrendingUp, TrendingDown, AlertTriangle, Trophy, Medal, Search,
} from "lucide-react";
import { useStore, formatBRL, formatDateTime } from "@/lib/store";
import type { KitchenName } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Administrativo — McDominus" }] }),
  component: DashboardPage,
});

const COLORS = ["var(--primary)", "#f5b800", "#22c55e", "#3b82f6", "#a855f7"];

function DashboardPage() {
  const orders = useStore((s) => s.orders);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t); }, []);
  const [search, setSearch] = useState("");

  const data = useMemo(() => computeDashboard(orders), [orders]);

  const filteredPending = data.pendingByCustomer.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search.replace(/\D/g, ""))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary font-bold uppercase tracking-wider text-xs mb-1">Painel administrativo</p>
          <h1 className="text-3xl md:text-4xl font-black">Dashboard McDominus</h1>
          <p className="text-muted-foreground">Métricas operacionais e financeiras em tempo real</p>
        </div>
        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-finished animate-pulse" /> Atualizado agora
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Pedidos pendentes" value={data.pendingOrders} icon={Clock} tone="warning" trend={+12} />
        <KPI label="Finalizados hoje" value={data.finishedToday} icon={CheckCircle2} tone="success" trend={+8} />
        <KPI label="Faturamento diário" value={formatBRL(data.revenueToday)} icon={DollarSign} tone="primary" trend={+15} />
        <KPI label="Faturamento mensal" value={formatBRL(data.revenueMonth)} icon={Wallet} tone="primary" trend={+22} />
        <KPI label="Pagamentos pendentes" value={data.pendingByCustomer.length} icon={AlertTriangle} tone="danger" trend={-3} />
        <KPI label="Ticket médio" value={formatBRL(data.avgTicket)} icon={TrendingUp} tone="primary" trend={+5} />
        <KPI label="Em preparo" value={data.preparing} icon={Flame} tone="warning" />
        <KPI label="Prontos" value={data.ready} icon={Package} tone="success" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Faturamento (últimos 7 dias)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenue7d}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pagamentos">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.payments} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4}>
                {data.payments.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pedidos por hora">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pedidos por cozinha">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byKitchen} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis type="category" dataKey="kitchen" stroke="var(--muted-foreground)" fontSize={11} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#f5b800" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pagamentos pendentes (acumulado)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.pending7d}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="var(--destructive)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Operational alerts */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Alert title="Pedidos atrasados" value={data.lateOrders} desc="Acima de 15 min em preparo" tone="danger" />
        <Alert title="Cozinhas sobrecarregadas" value={data.busiestKitchen} desc="Cozinha com maior fila" tone="warning" />
        <Alert title="Pagamentos pendentes" value={data.pendingByCustomer.length} desc="Clientes com débito aberto" tone="warning" />
        <Alert title="Tempo médio de preparo" value={`${data.avgPrepMin} min`} desc="Considerando pedidos finalizados" tone="info" />
      </div>

      {/* Pending payments table */}
      <Panel title="Clientes com pagamento pendente">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm focus:border-primary focus:outline-none" />
          </div>
          <span className="text-xs font-bold text-muted-foreground">{filteredPending.length} cliente(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">CPF</th>
                <th className="py-3 pr-4">Valor pendente</th>
                <th className="py-3 pr-4">Pedidos</th>
                <th className="py-3 pr-4">Último pedido</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum cliente com pendências.</td></tr>
              ) : filteredPending.map((p) => (
                <tr key={p.cpf} className="border-b hover:bg-muted/40 transition-colors">
                  <td className="py-3 pr-4 font-bold">{p.name}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{formatCPF(p.cpf)}</td>
                  <td className="py-3 pr-4 font-black text-primary">{formatBRL(p.amount)}</td>
                  <td className="py-3 pr-4">{p.count}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(p.lastAt)}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.status === "Atrasado" ? "bg-destructive/15 text-destructive" :
                      p.status === "Em cobrança" ? "bg-status-preparing/15 text-status-preparing" :
                      "bg-muted text-muted-foreground"
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Top customers */}
      <Panel title="Top clientes">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topCustomers.map((c, i) => (
            <motion.div key={c.cpf} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-muted/50 rounded-2xl p-5 border">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                  i === 0 ? "bg-gradient-yellow text-primary shadow-glow" :
                  i === 1 ? "bg-zinc-200 text-foreground" :
                  i === 2 ? "bg-amber-200 text-amber-900" : "bg-muted text-muted-foreground"
                }`}>
                  {i < 3 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.count} pedidos · último em {formatDateTime(c.lastAt)}</p>
                  <p className="text-xl font-black text-primary mt-2">{formatBRL(c.total)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Kitchen performance */}
      <Panel title="Desempenho das cozinhas">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.kitchenPerf.map((k) => (
            <div key={k.kitchen} className="bg-muted/40 rounded-2xl p-5 border">
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-primary" />
                <p className="font-black">{k.kitchen}</p>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label="Pedidos" value={k.count.toString()} />
                <Row label="Concluídos" value={k.done.toString()} />
                <Row label="Tempo médio" value={`${k.avgMin} min`} />
              </div>
            </div>
          ))}
          <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-5 shadow-elegant">
            <p className="text-xs uppercase font-bold opacity-80 mb-1">Mais rápida</p>
            <p className="text-xl font-black mb-3">{data.fastestKitchen}</p>
            <p className="text-xs uppercase font-bold opacity-80 mb-1">Mais ocupada</p>
            <p className="text-xl font-black">{data.busiestKitchen}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: "12px", fontSize: "12px", fontWeight: 600,
};

function KPI({ label, value, icon: Icon, tone, trend }: { label: string; value: string | number; icon: typeof Clock; tone: "primary" | "success" | "warning" | "danger"; trend?: number }) {
  const toneClass = tone === "primary" ? "text-primary bg-primary/10" : tone === "success" ? "text-status-finished bg-status-finished/15" : tone === "warning" ? "text-status-preparing bg-status-preparing/15" : "text-destructive bg-destructive/15";
  const TrendIcon = (trend ?? 0) >= 0 ? TrendingUp : TrendingDown;
  const trendClass = (trend ?? 0) >= 0 ? "text-status-finished" : "text-destructive";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border shadow-card p-5 hover:shadow-elegant transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold flex items-center gap-1 ${trendClass}`}>
            <TrendIcon className="w-3 h-3" /> {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-black tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">vs. ontem</p>
    </motion.div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-3xl border shadow-card p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Alert({ title, value, desc, tone }: { title: string; value: string | number; desc: string; tone: "danger" | "warning" | "info" }) {
  const toneClass = tone === "danger" ? "border-destructive/30 bg-destructive/5 text-destructive" : tone === "warning" ? "border-status-preparing/30 bg-status-preparing/5 text-status-preparing" : "border-status-assembly/30 bg-status-assembly/5 text-status-assembly";
  return (
    <motion.div whileHover={{ y: -3 }} className={`rounded-2xl border-2 p-5 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" /><p className="font-black text-sm uppercase tracking-wider">{title}</p></div>
      <p className="text-3xl font-black text-foreground mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>;
}

function formatCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function computeDashboard(orders: ReturnType<typeof useStore.getState>["orders"]) {
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const finished = orders.filter((o) => o.status === "finished");
  const finishedToday = finished.filter((o) => o.createdAt >= todayStart.getTime()).length;
  const revenueToday = finished.filter((o) => o.createdAt >= todayStart.getTime() && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const revenueMonth = finished.filter((o) => o.createdAt >= monthStart.getTime() && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status !== "finished").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready = orders.filter((o) => o.status === "assembly").length;
  const avgTicket = finished.length ? finished.reduce((s, o) => s + o.total, 0) / finished.length : 0;

  // 7-day revenue
  const revenue7d = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const next = d.getTime() + 86400_000;
    const v = finished.filter((o) => o.createdAt >= d.getTime() && o.createdAt < next && o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
    return { day: d.toLocaleDateString("pt-BR", { weekday: "short" }), value: Math.round(v) };
  });

  const pending7d = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const next = d.getTime() + 86400_000;
    const v = orders.filter((o) => o.createdAt >= d.getTime() && o.createdAt < next && o.paymentStatus !== "paid").reduce((s, o) => s + o.total, 0);
    return { day: d.toLocaleDateString("pt-BR", { weekday: "short" }), value: Math.round(v) };
  });

  // Hours
  const ordersByHour = Array.from({ length: 12 }).map((_, i) => {
    const h = 9 + i;
    const count = orders.filter((o) => new Date(o.createdAt).getHours() === h).length;
    return { hour: `${h}h`, count };
  });

  // Kitchens
  const kitchens: KitchenName[] = ["Sanduíches", "Bebidas", "Sobremesas", "Geral"];
  const byKitchen = kitchens.map((k) => ({
    kitchen: k,
    count: orders.reduce((s, o) => s + o.items.filter((i) => i.kitchen === k).reduce((a, b) => a + b.quantity, 0), 0),
  }));

  const kitchenPerf = kitchens.map((k) => {
    const involved = orders.filter((o) => o.items.some((i) => i.kitchen === k));
    const done = involved.filter((o) => o.status === "finished");
    const avgMs = done.length ? done.reduce((s, o) => s + ((o.finishedAt ?? o.createdAt) - o.createdAt), 0) / done.length : 0;
    return { kitchen: k, count: involved.length, done: done.length, avgMin: Math.max(1, Math.round(avgMs / 60000)) };
  });

  const fastestKitchen = [...kitchenPerf].sort((a, b) => a.avgMin - b.avgMin)[0]?.kitchen ?? "—";
  const busiestKitchen = [...kitchenPerf].sort((a, b) => b.count - a.count)[0]?.kitchen ?? "—";

  // Payments
  const payments = [
    { name: "PIX", value: orders.filter((o) => o.paymentMethod === "pix").length },
    { name: "Dinheiro", value: orders.filter((o) => o.paymentMethod === "cash").length },
    { name: "Pendente", value: orders.filter((o) => o.paymentMethod === "pending").length },
  ].filter((p) => p.value > 0);

  // Pending by customer
  const map = new Map<string, { name: string; cpf: string; amount: number; count: number; lastAt: number; status: string }>();
  orders.filter((o) => o.paymentStatus !== "paid").forEach((o) => {
    const cur = map.get(o.customerId) ?? { name: o.customerName, cpf: "", amount: 0, count: 0, lastAt: 0, status: "Pendente" };
    cur.amount += o.total; cur.count += 1; cur.lastAt = Math.max(cur.lastAt, o.createdAt);
    map.set(o.customerId, cur);
  });
  // attach CPFs
  const customers = useStore.getState().customers;
  customers.forEach((c) => { const m = map.get(c.id); if (m) { m.cpf = c.cpf; } });
  const pendingByCustomer = Array.from(map.values()).map((p) => {
    const ageH = (now - p.lastAt) / 3_600_000;
    p.status = ageH > 48 ? "Atrasado" : ageH > 12 ? "Em cobrança" : "Pendente";
    return p;
  }).sort((a, b) => b.amount - a.amount);

  // Top customers
  const topMap = new Map<string, { name: string; cpf: string; total: number; count: number; lastAt: number }>();
  orders.forEach((o) => {
    const cur = topMap.get(o.customerId) ?? { name: o.customerName, cpf: "", total: 0, count: 0, lastAt: 0 };
    cur.total += o.total; cur.count += 1; cur.lastAt = Math.max(cur.lastAt, o.createdAt);
    topMap.set(o.customerId, cur);
  });
  customers.forEach((c) => { const m = topMap.get(c.id); if (m) { m.cpf = c.cpf; } });
  const topCustomers = Array.from(topMap.values()).sort((a, b) => b.total - a.total).slice(0, 6);

  const lateOrders = orders.filter((o) => o.status !== "finished" && now - o.createdAt > 15 * 60_000).length;
  const avgPrepMin = kitchenPerf.length ? Math.round(kitchenPerf.reduce((s, k) => s + k.avgMin, 0) / kitchenPerf.length) : 0;

  return {
    pendingOrders, finishedToday, revenueToday, revenueMonth, avgTicket, preparing, ready,
    revenue7d, pending7d, ordersByHour, byKitchen, payments,
    pendingByCustomer, topCustomers, kitchenPerf, fastestKitchen, busiestKitchen,
    lateOrders, avgPrepMin,
  };
}
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Package,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { getDashboardSummary, getOrders, type ApiOrder } from "@/lib/api";
import { formatBRL, formatCPF, formatDateTime } from "@/lib/format";
import { useOrdersSocket } from "@/websocket/websocket-hooks";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Administrativo - McDominus" }] }),
  component: DashboardPage,
});

const COLORS = ["var(--primary)", "#f5b800", "#22c55e", "#ef4444"];

function DashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
  });
  const ordersQuery = useQuery({
    queryKey: ["orders", "dashboard"],
    queryFn: () => getOrders({ size: 500, sort: "orderTime,desc" }),
  });
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["orders", "dashboard"] });
  }, [queryClient]);
  useOrdersSocket(refresh);

  const summary = summaryQuery.data;
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);
  const data = useMemo(() => computeDashboard(orders), [orders]);
  const filteredPending = data.pendingByCustomer.filter(
    (pending) =>
      pending.name.toLowerCase().includes(search.toLowerCase()) ||
      pending.cpf.includes(search.replace(/\D/g, "")),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary font-bold uppercase tracking-wider text-xs mb-1">
            Painel administrativo
          </p>
          <h1 className="text-3xl md:text-4xl font-black">Dashboard McDominus</h1>
          <p className="text-muted-foreground">Métricas operacionais e financeiras em tempo real</p>
        </div>
        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-finished animate-pulse" /> Dados da API
        </div>
      </div>

      {(summaryQuery.isError || ordersQuery.isError) && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-destructive font-medium">
          Parte dos dados não pôde ser atualizada.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          label="Pedidos hoje"
          value={summary?.ordersToday ?? 0}
          icon={ShoppingBag}
          tone="primary"
        />
        <KPI label="Em preparo" value={summary?.preparingOrders ?? 0} icon={Flame} tone="warning" />
        <KPI
          label="Prontos"
          value={summary?.readyForPickupOrders ?? 0}
          icon={Package}
          tone="success"
        />
        <KPI
          label="Finalizados hoje"
          value={summary?.finishedToday ?? 0}
          icon={CheckCircle2}
          tone="success"
        />
        <KPI
          label="Faturamento diário"
          value={formatBRL(summary?.revenueToday ?? 0)}
          icon={DollarSign}
          tone="primary"
        />
        <KPI
          label="Pagamentos pendentes"
          value={summary?.pendingPayments ?? 0}
          icon={AlertTriangle}
          tone="danger"
        />
        <KPI
          label="Cancelados hoje"
          value={summary?.cancelledToday ?? 0}
          icon={XCircle}
          tone="danger"
        />
        <KPI
          label="Ticket médio visível"
          value={formatBRL(data.averageTicket)}
          icon={DollarSign}
          tone="primary"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Faturamento pago (últimos 7 dias)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenue7d}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip
                formatter={(value: number) => formatBRL(value)}
                contentStyle={tooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={3}
                fill="url(#revenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Métodos de pagamento">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.payments}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              >
                {data.payments.map((item, index) => (
                  <Cell key={item.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pedidos de hoje por hora" className="lg:col-span-2">
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

        <Panel title="Status dos pedidos carregados">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.statuses}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={82}
              >
                {data.statuses.map((item, index) => (
                  <Cell key={item.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Clientes com pagamento pendente">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {filteredPending.length} cliente(s)
          </span>
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
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum cliente com pendência na listagem carregada.
                  </td>
                </tr>
              ) : (
                filteredPending.map((pending) => (
                  <tr key={pending.cpf} className="border-b hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 font-bold">{pending.name}</td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">
                      {formatCPF(pending.cpf)}
                    </td>
                    <td className="py-3 pr-4 font-black text-primary">
                      {formatBRL(pending.amount)}
                    </td>
                    <td className="py-3 pr-4">{pending.count}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateTime(pending.lastAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 600,
};

function KPI({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary bg-primary/10"
      : tone === "success"
        ? "text-status-finished bg-status-finished/15"
        : tone === "warning"
          ? "text-status-preparing bg-status-preparing/15"
          : "text-destructive bg-destructive/15";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border shadow-card p-5 hover:shadow-elegant transition-shadow"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${toneClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-black tabular-nums">{value}</p>
    </motion.div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card rounded-3xl border shadow-card p-6 ${className}`}>
      <h3 className="font-black text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}

function computeDashboard(orders: ApiOrder[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const paid = orders.filter((order) => order.paymentStatus === "PAID");
  const averageTicket = paid.length
    ? paid.reduce((sum, order) => sum + order.totalValue, 0) / paid.length
    : 0;

  const revenue7d = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    day.setHours(0, 0, 0, 0);
    const next = day.getTime() + 86_400_000;
    const value = paid
      .filter((order) => {
        const time = new Date(order.orderTime).getTime();
        return time >= day.getTime() && time < next;
      })
      .reduce((sum, order) => sum + order.totalValue, 0);
    return { day: day.toLocaleDateString("pt-BR", { weekday: "short" }), value: Math.round(value) };
  });

  const ordersByHour = Array.from({ length: 12 }, (_, index) => {
    const hour = 9 + index;
    const count = orders.filter((order) => {
      const time = new Date(order.orderTime);
      return time.getTime() >= todayStart.getTime() && time.getHours() === hour;
    }).length;
    return { hour: `${hour}h`, count };
  });

  const payments = [
    { name: "PIX", value: orders.filter((order) => order.paymentMethod === "PIX").length },
    {
      name: "Dinheiro",
      value: orders.filter((order) => order.paymentMethod === "DINHEIRO").length,
    },
    { name: "Pendente", value: orders.filter((order) => order.paymentMethod === "PENDING").length },
  ].filter((item) => item.value > 0);

  const statuses = [
    { name: "Em preparo", value: orders.filter((order) => order.status === "PENDING").length },
    { name: "Pronto", value: orders.filter((order) => order.status === "READY_FOR_PICKUP").length },
    { name: "Finalizado", value: orders.filter((order) => order.status === "FINISHED").length },
    { name: "Cancelado", value: orders.filter((order) => order.status === "CANCELLED").length },
  ].filter((item) => item.value > 0);

  const pendingMap = new Map<
    string,
    { name: string; cpf: string; amount: number; count: number; lastAt: string }
  >();
  orders
    .filter((order) => order.paymentStatus === "PENDING")
    .forEach((order) => {
      const current = pendingMap.get(order.client.cpf) ?? {
        name: order.client.name,
        cpf: order.client.cpf,
        amount: 0,
        count: 0,
        lastAt: order.orderTime,
      };
      current.amount += order.totalValue;
      current.count += 1;
      if (new Date(order.orderTime) > new Date(current.lastAt)) current.lastAt = order.orderTime;
      pendingMap.set(order.client.cpf, current);
    });

  return {
    averageTicket,
    revenue7d,
    ordersByHour,
    payments,
    statuses,
    pendingByCustomer: [...pendingMap.values()].sort(
      (first, second) => second.amount - first.amount,
    ),
  };
}

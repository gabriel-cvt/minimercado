import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
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
  Banknote,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Package,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDashboardAnalytics,
  getDashboardSummary,
  getOrders,
  markOrderPaid,
  type ApiOrder,
} from "@/lib/api";
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
  const [pendingTarget, setPendingTarget] = useState<PendingCustomer | null>(null);
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
  });
  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "analytics", 3],
    queryFn: () => getDashboardAnalytics(3),
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
  const paymentMutation = useMutation({
    mutationFn: (orderIds: number[]) => Promise.all(orderIds.map((id) => markOrderPaid(id))),
    onSuccess: async (paidOrders) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(
        paidOrders.length === 1
          ? "Pagamento confirmado com sucesso"
          : `${paidOrders.length} pagamentos confirmados com sucesso`,
      );
      setPendingTarget(null);
    },
    onError: () =>
      toast.error("Não foi possível confirmar os pagamentos pendentes.", {
        duration: Infinity,
      }),
  });

  const summary = summaryQuery.data;
  const analytics = analyticsQuery.data;
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);
  const data = useMemo(() => computeDashboard(orders), [orders]);
  const paymentMethods = (analytics?.paymentMethods ?? []).map((metric) => ({
    name: metric.paymentMethod === "DINHEIRO" ? "Dinheiro" : metric.paymentMethod,
    value: metric.ordersCount,
  }));
  const ordersByHour = (analytics?.ordersByHour ?? []).map((metric) => ({
    hour: `${metric.hour}h`,
    count: metric.ordersCount,
  }));
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

      {(summaryQuery.isError || analyticsQuery.isError || ordersQuery.isError) && (
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
          label="Tempo médio preparo"
          value={`${analytics?.averagePreparationMinutes ?? summary?.averagePreparationMinutes ?? 0} min`}
          icon={Clock}
          tone="primary"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Top produtos (últimos 3 dias)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.topProducts ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                width={125}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="quantitySold"
                name="Unidades"
                fill="var(--primary)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Métodos de pagamento">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentMethods}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              >
                {paymentMethods.map((item, index) => (
                  <Cell key={item.name} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pedidos por hora (últimos 3 dias)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersByHour}>
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

      <Panel title="Top clientes (últimos 3 dias)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">CPF</th>
                <th className="py-3 pr-4">Pedidos pagos</th>
                <th className="py-3 pr-4">Total pago</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.topClients ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nenhum pagamento confirmado no período.
                  </td>
                </tr>
              ) : (
                analytics!.topClients.map((client) => (
                  <tr
                    key={client.clientId}
                    className="border-b hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-bold">{client.name}</td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">
                      {formatCPF(client.cpf)}
                    </td>
                    <td className="py-3 pr-4">{client.ordersCount}</td>
                    <td className="py-3 pr-4 font-black text-primary">
                      {formatBRL(client.totalSpent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

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
                <th className="py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
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
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setPendingTarget(pending)}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <Banknote className="h-4 w-4" /> Marcar pago
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <AnimatePresence>
        {pendingTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPendingTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-md w-full p-6"
            >
              <h3 className="text-xl font-black mb-2">Confirmar pagamentos</h3>
              <p className="text-muted-foreground text-sm mb-5">
                {pendingTarget.name} possui {pendingTarget.count} pedido(s) pendente(s), no valor
                total de {formatBRL(pendingTarget.amount)}.
              </p>
              <p className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold mb-5">
                A confirmação preservará a forma de pagamento informada em cada pedido.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingTarget(null)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => paymentMutation.mutate(pendingTarget.orderIds)}
                  disabled={paymentMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
              {paymentMutation.isError && (
                <p className="mt-3 text-sm text-destructive">
                  Não foi possível confirmar todos os pagamentos.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

interface PendingCustomer {
  name: string;
  cpf: string;
  amount: number;
  count: number;
  lastAt: string;
  orderIds: number[];
}

function computeDashboard(orders: ApiOrder[]) {
  const statuses = [
    { name: "Em preparo", value: orders.filter((order) => order.status === "PENDING").length },
    { name: "Pronto", value: orders.filter((order) => order.status === "READY_FOR_PICKUP").length },
    { name: "Finalizado", value: orders.filter((order) => order.status === "FINISHED").length },
    { name: "Cancelado", value: orders.filter((order) => order.status === "CANCELLED").length },
  ].filter((item) => item.value > 0);

  const pendingMap = new Map<string, PendingCustomer>();
  orders
    .filter((order) => order.paymentStatus === "PENDING")
    .forEach((order) => {
      const current = pendingMap.get(order.client.cpf) ?? {
        name: order.client.name,
        cpf: order.client.cpf,
        amount: 0,
        count: 0,
        lastAt: order.orderTime,
        orderIds: [],
      };
      current.amount += order.totalValue;
      current.count += 1;
      current.orderIds.push(order.id);
      if (new Date(order.orderTime) > new Date(current.lastAt)) current.lastAt = order.orderTime;
      pendingMap.set(order.client.cpf, current);
    });

  return {
    statuses,
    pendingByCustomer: [...pendingMap.values()].sort(
      (first, second) => second.amount - first.amount,
    ),
  };
}

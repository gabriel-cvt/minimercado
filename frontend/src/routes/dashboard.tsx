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
  FileSpreadsheet,
  Flame,
  Package,
  Search,
  ShoppingBag,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDashboardAnalytics,
  getDashboardSummary,
  getOrders,
  markOrderPaid,
  type ApiOrder,
  type ApiPaymentMethod,
} from "@/lib/api";
import { formatBRL, formatCPF, formatDateTime, formatPhone } from "@/lib/format";
import { useOrdersSocket } from "@/websocket/websocket-hooks";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Painel de Resultados - McDomine's" }] }),
  component: DashboardPage,
});

const PAYMENT_COLORS: Record<string, string> = {
  PIX: "var(--chart-2)",
  Dinheiro: "var(--status-finished)",
};

const STATUS_COLORS: Record<string, string> = {
  "Em preparo": "var(--status-preparing)",
  Pronto: "var(--chart-2)",
  Finalizado: "var(--status-finished)",
  Cancelado: "var(--destructive)",
};

function DashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingTarget, setPendingTarget] = useState<PendingCustomer | null>(null);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<ApiPaymentMethod>("PIX");
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
  });
  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: getDashboardAnalytics,
  });
  const ordersQuery = useQuery({
    queryKey: ["orders", "dashboard"],
    queryFn: () => getOrders({ size: 500, sort: "orderTime,desc" }),
  });
  const pendingOrdersQuery = useQuery({
    queryKey: ["orders", "dashboard", "pending"],
    queryFn: () => getOrders({ paymentStatus: "PENDING", size: 500, sort: "orderTime,asc" }),
  });
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["orders", "dashboard"] });
  }, [queryClient]);
  useOrdersSocket(refresh);
  const paymentMutation = useMutation({
    mutationFn: ({ orders, fallbackPaymentMethod }: PendingPaymentConfirmation) =>
      Promise.all(
        orders.map((order) =>
          markOrderPaid(order.id, order.paymentMethod ?? fallbackPaymentMethod),
        ),
      ),
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
  const pendingOrders = useMemo(
    () => pendingOrdersQuery.data?.content ?? [],
    [pendingOrdersQuery.data],
  );
  const data = useMemo(() => computeDashboard(orders, pendingOrders), [orders, pendingOrders]);
  const totalOrders = Math.max(
    summary?.totalOrders ?? ordersQuery.data?.totalElements ?? orders.length,
    summary?.ordersToday ?? 0,
  );
  const loadedPaidRevenue = orders
    .filter((order) => order.paymentStatus === "PAID")
    .reduce((sum, order) => sum + order.totalValue, 0);
  const totalRevenue = Math.max(
    summary?.totalRevenue ?? 0,
    summary?.revenueToday ?? 0,
    loadedPaidRevenue,
  );
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
  const exportPendingCustomers = useCallback(() => {
    exportPendingCustomersCsv(filteredPending);
  }, [filteredPending]);

  return (
    <div className="relative isolate max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-28 h-80 w-80 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-status-preparing/[0.13] blur-3xl" />
        <div className="absolute bottom-12 left-1/3 h-72 w-72 rounded-full bg-chart-2/[0.08] blur-3xl" />
      </div>
      <section className="relative overflow-hidden rounded-3xl border border-white/75 bg-white/55 p-6 shadow-[0_16px_46px_-24px_oklch(0.18_0.02_30_/_0.24)] backdrop-blur-2xl md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-status-preparing/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary font-bold uppercase tracking-wider text-xs mb-1">
              Painel administrativo
            </p>
            <h1 className="text-3xl md:text-4xl font-black">Resultados McDomine's</h1>
            <p className="text-muted-foreground">
              Pedidos, pagamentos e vendas em um só lugar
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/45 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-status-finished animate-pulse" /> Atualizado
          </div>
        </div>
      </section>

      {(summaryQuery.isError ||
        analyticsQuery.isError ||
        ordersQuery.isError ||
        pendingOrdersQuery.isError) && (
        <div className="rounded-xl border border-destructive/20 bg-white/55 px-4 py-3 font-medium text-destructive shadow-card backdrop-blur-xl">
          Parte dos dados não pôde ser atualizada.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <BalanceHighlight
          label="Saldo em conta"
          title="Faturamento geral"
          value={formatBRL(totalRevenue)}
          detail="Total recebido em pedidos pagos"
          icon={Wallet}
          tone="finance"
        />
        <BalanceHighlight
          label="Movimento total"
          title="Pedidos totais"
          value={totalOrders}
          detail="Pedidos registrados desde o início"
          icon={ShoppingBag}
          tone="orders"
        />
      </div>

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
        <Panel
          title="Produtos mais pedidos"
          subtitle="Itens com maior saída desde o início"
          tone="brand"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.topProducts ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.7} />
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

        <Panel title="Métodos de pagamento" subtitle="Pagamentos confirmados" tone="finance">
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
                {paymentMethods.map((item) => (
                  <Cell key={item.name} fill={PAYMENT_COLORS[item.name] ?? "var(--chart-3)"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Pedidos por hora"
          subtitle="Horários com mais pedidos desde o início"
          tone="operations"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.7} />
              <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Pedidos"
                fill="var(--chart-2)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Situação dos pedidos"
          subtitle="Como estão os pedidos agora"
          tone="status"
        >
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
                {data.statuses.map((item) => (
                  <Cell key={item.name} fill={STATUS_COLORS[item.name] ?? "var(--chart-3)"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel
        title="Clientes que mais compraram"
        subtitle="Clientes com mais pagamentos confirmados"
        tone="finance"
      >
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
                    Nenhum pagamento confirmado.
                  </td>
                </tr>
              ) : (
                analytics!.topClients.map((client) => (
                  <tr
                    key={client.clientId}
                    className="border-b hover:bg-white/45 transition-colors"
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

      <Panel
        title="Clientes com pagamento pendente"
        subtitle="Cobranças que ainda precisam de confirmação"
        tone="warning"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full rounded-xl border border-white/80 bg-white/45 py-2.5 pl-10 pr-4 text-sm shadow-sm backdrop-blur-md focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">
              {filteredPending.length} cliente(s)
            </span>
            <button
              onClick={exportPendingCustomers}
              disabled={filteredPending.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/55 px-3 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar planilha
            </button>
          </div>
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
                  <tr key={pending.cpf} className="border-b hover:bg-white/45 transition-colors">
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
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant"
            >
              <h3 className="text-xl font-black mb-2">Confirmar pagamentos</h3>
              <p className="text-muted-foreground text-sm mb-5">
                {pendingTarget.name} possui {pendingTarget.count} pedido(s) pendente(s), no valor
                total de {formatBRL(pendingTarget.amount)}.
              </p>
              <p className="mb-5 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold">
                {pendingTarget.hasMissingPaymentMethod
                  ? "Escolha a forma de pagamento para os pedidos sem método informado."
                  : "A confirmação preservará a forma de pagamento informada em cada pedido."}
              </p>
              {pendingTarget.hasMissingPaymentMethod && (
                <div className="mb-5 grid grid-cols-2 gap-2">
                  {[
                    { value: "PIX" as const, label: "PIX" },
                    { value: "DINHEIRO" as const, label: "Dinheiro" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setBulkPaymentMethod(option.value)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors ${
                        bulkPaymentMethod === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingTarget(null)}
                  className="flex-1 rounded-xl border-2 border-border py-3 font-bold transition-colors hover:border-primary/30 hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    paymentMutation.mutate({
                      orders: pendingTarget.paymentOrders,
                      fallbackPaymentMethod: pendingTarget.hasMissingPaymentMethod
                        ? bulkPaymentMethod
                        : undefined,
                    })
                  }
                  disabled={paymentMutation.isPending}
                  className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-glow disabled:opacity-50"
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
  background: "color-mix(in oklch, var(--card), white 18%)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  boxShadow: "var(--shadow-card)",
  fontSize: "12px",
  fontWeight: 600,
};

function BalanceHighlight({
  label,
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Clock;
  tone: "finance" | "orders";
}) {
  const style =
    tone === "finance"
      ? {
          shell:
            "border-status-finished/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(229,246,236,0.72))]",
          icon: "bg-status-finished/15 text-status-finished",
          rail: "bg-status-finished",
        }
      : {
          shell:
            "border-primary/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(236,242,255,0.72))]",
          icon: "bg-primary/10 text-primary",
          rail: "bg-primary",
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative min-h-[168px] overflow-hidden rounded-3xl border p-6 shadow-[0_18px_48px_-25px_oklch(0.18_0.02_30_/_0.36)] backdrop-blur-2xl ${style.shell}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${style.rail}`} />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <h2 className="mt-1 text-base font-black text-foreground">{title}</h2>
          </div>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="text-4xl font-black tabular-nums tracking-normal text-foreground md:text-5xl">
            {value}
          </p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

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
  const style =
    tone === "primary"
      ? {
          icon: "text-primary bg-primary/10",
          glow: "bg-primary/[0.10]",
        }
      : tone === "success"
        ? {
            icon: "text-status-finished bg-status-finished/15",
            glow: "bg-status-finished/[0.11]",
          }
        : tone === "warning"
          ? {
              icon: "text-status-assembly bg-status-preparing/20",
              glow: "bg-status-preparing/[0.14]",
            }
          : {
              icon: "text-destructive bg-destructive/10",
              glow: "bg-destructive/[0.09]",
            };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/75 bg-white/55 p-5 shadow-[0_14px_34px_-24px_oklch(0.18_0.02_30_/_0.3)] backdrop-blur-xl transition-shadow hover:shadow-elegant"
    >
      <div
        className={`pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full blur-2xl ${style.glow}`}
      />
      <div
        className={`relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="relative mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="relative text-2xl font-black tabular-nums md:text-3xl">{value}</p>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  tone = "neutral",
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  tone?: "neutral" | "brand" | "finance" | "operations" | "status" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const style = {
    neutral: { glow: "bg-muted/30", line: "bg-border" },
    brand: { glow: "bg-primary/[0.09]", line: "bg-primary" },
    finance: {
      glow: "bg-status-finished/[0.09]",
      line: "bg-status-finished",
    },
    operations: { glow: "bg-chart-2/[0.09]", line: "bg-chart-2" },
    status: {
      glow: "bg-status-preparing/[0.10]",
      line: "bg-status-preparing",
    },
    warning: { glow: "bg-status-preparing/[0.12]", line: "bg-status-preparing" },
  };
  const accent = style[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/75 bg-white/55 p-6 shadow-[0_16px_42px_-25px_oklch(0.18_0.02_30_/_0.3)] backdrop-blur-xl ${className}`}
    >
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl ${accent.glow}`}
      />
      <div
        className={`pointer-events-none absolute left-6 top-0 h-1 w-20 rounded-b-full ${accent.line}`}
      />
      <div className="relative">
        <h3 className="font-black text-lg">{title}</h3>
        {subtitle && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}
        {!subtitle && <div className="mb-4" />}
        {children}
      </div>
    </div>
  );
}

interface PendingCustomer {
  name: string;
  cpf: string;
  team: string;
  phoneNumber: string;
  amount: number;
  count: number;
  lastAt: string;
  paymentOrders: PendingPaymentOrder[];
  hasMissingPaymentMethod: boolean;
}

interface PendingPaymentOrder {
  id: number;
  paymentMethod: ApiPaymentMethod | null;
}

interface PendingPaymentConfirmation {
  orders: PendingPaymentOrder[];
  fallbackPaymentMethod?: ApiPaymentMethod;
}

function computeDashboard(orders: ApiOrder[], pendingOrders: ApiOrder[]) {
  const statuses = [
    { name: "Em preparo", value: orders.filter((order) => order.status === "PENDING").length },
    { name: "Pronto", value: orders.filter((order) => order.status === "READY_FOR_PICKUP").length },
    { name: "Finalizado", value: orders.filter((order) => order.status === "FINISHED").length },
    { name: "Cancelado", value: orders.filter((order) => order.status === "CANCELLED").length },
  ].filter((item) => item.value > 0);

  const pendingMap = new Map<string, PendingCustomer>();
  pendingOrders
    .filter((order) => order.paymentStatus === "PENDING")
    .forEach((order) => {
      const current = pendingMap.get(order.client.cpf) ?? {
        name: order.client.name,
        cpf: order.client.cpf,
        team: order.client.team ?? "",
        phoneNumber: order.client.phoneNumber ?? "",
        amount: 0,
        count: 0,
        lastAt: order.orderTime,
        paymentOrders: [],
        hasMissingPaymentMethod: false,
      };
      current.amount += order.totalValue;
      current.count += 1;
      current.team ||= order.client.team ?? "";
      current.phoneNumber ||= order.client.phoneNumber ?? "";
      current.paymentOrders.push({ id: order.id, paymentMethod: order.paymentMethod });
      if (order.paymentMethod === null) current.hasMissingPaymentMethod = true;
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

function exportPendingCustomersCsv(customers: PendingCustomer[]) {
  if (typeof window === "undefined" || customers.length === 0) return;

  const rows = [
    [
      "Cliente",
      "CPF",
      "Equipe",
      "Telefone",
      "Valor pendente",
      "Pedidos",
      "Ultimo pedido",
    ],
    ...customers.map((customer) => [
      customer.name,
      formatCPF(customer.cpf),
      customer.team || "Nao informada",
      customer.phoneNumber ? formatPhone(customer.phoneNumber) : "Nao informado",
      customer.amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      String(customer.count),
      formatDateTime(customer.lastAt),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `clientes-pagamento-pendente-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

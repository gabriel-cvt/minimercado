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
  getDashboardTopProducts,
  getAllOrders,
  markOrderPaid,
  type ApiOrder,
  type ApiPaymentMethod,
  type ApiTopProduct,
} from "@/lib/api";
import { formatBRL, formatDateTime, formatPhone } from "@/lib/format";
import { useOrdersSocket } from "@/websocket/websocket-hooks";
import { useBranding } from "@/branding/branding";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Resultados — Sistema de Pedidos" }] }),
  component: DashboardPage,
});

const PAYMENT_COLORS: Record<string, string> = {
  PIX: "var(--chart-2)",
  Dinheiro: "var(--status-finished)",
  Cartão: "var(--chart-4)",
};

const STATUS_COLORS: Record<string, string> = {
  "Em preparo": "var(--status-preparing)",
  Pronto: "var(--chart-2)",
  Finalizado: "var(--status-finished)",
  Cancelado: "var(--destructive)",
};

function DashboardPage() {
  const branding = useBranding();
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
  const pendingOrdersQuery = useQuery({
    queryKey: ["orders", "dashboard", "pending"],
    queryFn: () => getAllOrders({ paymentStatus: "PENDING", sort: "orderTime,asc" }),
  });
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["orders", "dashboard"] });
  }, [queryClient]);
  useOrdersSocket(refresh);
  const paymentMutation = useMutation({
    mutationFn: async ({ orders, fallbackPaymentMethod }: PendingPaymentConfirmation) => {
      const results = await Promise.allSettled(
        orders.map((order) =>
          markOrderPaid(order.id, order.paymentMethod ?? fallbackPaymentMethod),
        ),
      );
      return {
        paidOrders: results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        ),
        failedCount: results.filter((result) => result.status === "rejected").length,
      };
    },
    onSuccess: async ({ paidOrders, failedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (failedCount === 0) {
        toast.success(
          paidOrders.length === 1
            ? "Pagamento confirmado com sucesso"
            : `${paidOrders.length} pagamentos confirmados com sucesso`,
        );
      } else {
        toast.error(
          `${paidOrders.length} pagamento(s) confirmado(s) e ${failedCount} não confirmado(s). A lista foi atualizada.`,
          { duration: Infinity },
        );
      }
      setPendingTarget(null);
    },
    onError: () =>
      toast.error("Não foi possível confirmar os pagamentos pendentes.", {
        duration: Infinity,
      }),
  });
  const topProductsExportMutation = useMutation({
    mutationFn: getDashboardTopProducts,
    onSuccess: (products) => {
      if (products.length === 0) {
        toast.info("Nenhum produto pedido para exportar.");
        return;
      }

      exportTopProductsCsv(products);
      toast.success("Planilha de produtos mais pedidos exportada.");
    },
    onError: () =>
      toast.error("Não foi possível exportar os produtos mais pedidos.", {
        duration: Infinity,
      }),
  });

  const summary = summaryQuery.data;
  const analytics = analyticsQuery.data;
  const pendingOrders = useMemo(() => pendingOrdersQuery.data ?? [], [pendingOrdersQuery.data]);
  const data = useMemo(
    () => computeDashboard(analytics?.statuses ?? [], pendingOrders),
    [analytics?.statuses, pendingOrders],
  );
  const totalOrders = Math.max(summary?.totalOrders ?? 0, summary?.ordersToday ?? 0);
  const totalRevenue = Math.max(summary?.totalRevenue ?? 0, summary?.revenueToday ?? 0);
  const paymentMethods = (analytics?.paymentMethods ?? []).map((metric) => ({
    name: paymentMethodLabel(metric.paymentMethod),
    value: metric.ordersCount,
  }));
  const ordersByHour = (analytics?.ordersByHour ?? []).map((metric) => ({
    hour: `${metric.hour}h`,
    count: metric.ordersCount,
  }));
  const filteredPending = data.pendingByCustomer.filter(
    (pending) =>
      pending.name.toLowerCase().includes(search.toLowerCase()) ||
      pending.phoneNumber.includes(search.replace(/\D/g, "")),
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
      <section className="relative overflow-hidden rounded-3xl border border-card/75 bg-card/55 p-6 shadow-card backdrop-blur-2xl md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-status-preparing/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary font-bold uppercase tracking-wider text-xs mb-1">
              Painel administrativo
            </p>
            <h1 className="text-3xl md:text-4xl font-black">Resultados {branding.businessName}</h1>
            <p className="text-muted-foreground">Pedidos, pagamentos e vendas em um só lugar</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-card/80 bg-card/45 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-status-finished animate-pulse" /> Atualizado
          </div>
        </div>
      </section>

      {(summaryQuery.isError || analyticsQuery.isError || pendingOrdersQuery.isError) && (
        <div className="rounded-xl border border-destructive/20 bg-card/55 px-4 py-3 font-medium text-destructive shadow-card backdrop-blur-xl">
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              Ranking por quantidade pedida
            </span>
            <button
              onClick={() => topProductsExportMutation.mutate()}
              disabled={topProductsExportMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-card/80 bg-card/55 px-3 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-card/75 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {topProductsExportMutation.isPending ? "Exportando..." : "Exportar planilha"}
            </button>
          </div>
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
              <Bar dataKey="count" name="Pedidos" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Situação dos pedidos" subtitle="Como estão os pedidos agora" tone="status">
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
        title="Fiados pendentes"
        subtitle="Cobranças que ainda precisam de confirmação"
        tone="warning"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full rounded-xl border border-card/80 bg-card/45 py-2.5 pl-10 pr-4 text-sm shadow-sm backdrop-blur-md focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">
              {filteredPending.length} pessoa(s)
            </span>
            <button
              onClick={exportPendingCustomers}
              disabled={filteredPending.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-card/80 bg-card/55 px-3 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-card/75 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar planilha
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-3 pr-4">Pessoa</th>
                <th className="py-3 pr-4">Telefone</th>
                <th className="py-3 pr-4">Equipe</th>
                <th className="py-3 pr-4">Valor pendente</th>
                <th className="py-3 pr-4">Pedidos</th>
                <th className="py-3 pr-4">Último pedido</th>
                <th className="py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum fiado pendente na listagem carregada.
                  </td>
                </tr>
              ) : (
                filteredPending.map((pending) => (
                  <tr key={pending.key} className="border-b hover:bg-card/45 transition-colors">
                    <td className="py-3 pr-4 font-bold">{pending.name}</td>
                    <td className="py-3 pr-4">{formatPhone(pending.phoneNumber)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{pending.team}</td>
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
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {[
                    { value: "PIX" as const, label: "PIX" },
                    { value: "DINHEIRO" as const, label: "Dinheiro" },
                    { value: "CARTAO" as const, label: "Cartão" },
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
      className={`relative min-h-[168px] overflow-hidden rounded-3xl border p-6 shadow-card backdrop-blur-2xl ${style.shell}`}
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
      className="relative overflow-hidden rounded-2xl border border-card/75 bg-card/55 p-5 shadow-card backdrop-blur-xl transition-shadow hover:shadow-elegant"
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
      className={`relative overflow-hidden rounded-3xl border border-card/75 bg-card/55 p-6 shadow-card backdrop-blur-xl ${className}`}
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
  key: string;
  name: string;
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
  itemsSummary: string;
}

interface PendingPaymentConfirmation {
  orders: PendingPaymentOrder[];
  fallbackPaymentMethod?: ApiPaymentMethod;
}

function computeDashboard(
  statusMetrics: { status: ApiOrder["status"]; ordersCount: number }[],
  pendingOrders: ApiOrder[],
) {
  const labels: Record<ApiOrder["status"], string> = {
    PENDING: "Em preparo",
    READY_FOR_PICKUP: "Pronto",
    FINISHED: "Finalizado",
    CANCELLED: "Cancelado",
  };
  const statuses = statusMetrics
    .map((metric) => ({ name: labels[metric.status], value: metric.ordersCount }))
    .filter((item) => item.value > 0);

  const pendingMap = new Map<string, PendingCustomer>();
  pendingOrders
    .filter((order) => order.paymentStatus === "PENDING")
    .forEach((order) => {
      const phoneNumber = order.customerPhoneNumber ?? "";
      const name = order.customerName ?? `Pedido #${order.id}`;
      const team = order.customerTeam ?? "Nao informada";
      const key = phoneNumber || `${name}:${team}`;
      const current = pendingMap.get(key) ?? {
        key,
        name,
        team,
        phoneNumber,
        amount: 0,
        count: 0,
        lastAt: order.orderTime,
        paymentOrders: [],
        hasMissingPaymentMethod: false,
      };
      current.amount += order.totalValue;
      current.count += 1;
      current.team ||= team;
      current.phoneNumber ||= phoneNumber;
      current.paymentOrders.push({
        id: order.id,
        paymentMethod: order.paymentMethod,
        itemsSummary: formatPendingOrderItems(order),
      });
      if (order.paymentMethod === null) current.hasMissingPaymentMethod = true;
      if (new Date(order.orderTime) > new Date(current.lastAt)) current.lastAt = order.orderTime;
      pendingMap.set(key, current);
    });

  return {
    statuses,
    pendingByCustomer: [...pendingMap.values()].sort(
      (first, second) => second.amount - first.amount,
    ),
  };
}

function exportTopProductsCsv(products: ApiTopProduct[]) {
  if (typeof window === "undefined" || products.length === 0) return;

  const sortedProducts = [...products].sort((first, second) => {
    const quantityComparison = second.quantitySold - first.quantitySold;
    if (quantityComparison !== 0) return quantityComparison;

    const valueComparison = second.totalValue - first.totalValue;
    if (valueComparison !== 0) return valueComparison;

    return first.name.localeCompare(second.name, "pt-BR");
  });
  const rows = [
    ["Posicao", "Produto", "Quantidade pedida", "Valor vendido"],
    ...sortedProducts.map((product, index) => [
      String(index + 1),
      product.name,
      String(product.quantitySold),
      product.totalValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `produtos-mais-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportPendingCustomersCsv(customers: PendingCustomer[]) {
  if (typeof window === "undefined" || customers.length === 0) return;

  const rows = [
    [
      "Pessoa",
      "Equipe",
      "Telefone",
      "Valor pendente",
      "Pedidos",
      "Pedidos pendentes",
      "Itens dos pedidos",
    ],
    ...customers.map((customer) => [
      customer.name,
      customer.team || "Nao informada",
      customer.phoneNumber ? formatPhone(customer.phoneNumber) : "Nao informado",
      customer.amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      String(customer.count),
      customer.paymentOrders
        .map((order) => `#${order.id}`)
        .sort((first, second) => Number(first.slice(1)) - Number(second.slice(1)))
        .join(", "),
      [...customer.paymentOrders]
        .sort((first, second) => first.id - second.id)
        .map((order) => `#${order.id}: ${order.itemsSummary}`)
        .join(" || "),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `fiados-pendentes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPendingOrderItems(order: ApiOrder) {
  return order.items.map(formatPendingOrderItem).join(" | ");
}

function formatPendingOrderItem(item: ApiOrder["items"][number]) {
  const variants = selectedVariantNamesForItem(item);
  const variantText = variants.length > 0 ? ` (${variants.join(", ")})` : "";
  return `${item.productName}${variantText} x${item.quantity}`;
}

function selectedVariantNamesForItem(item: ApiOrder["items"][number]) {
  if (item.selectedVariantNames && item.selectedVariantNames.length > 0) {
    return item.selectedVariantNames;
  }
  return item.selectedVariantName ? [item.selectedVariantName] : [];
}

function paymentMethodLabel(paymentMethod: ApiPaymentMethod) {
  if (paymentMethod === "DINHEIRO") return "Dinheiro";
  if (paymentMethod === "CARTAO") return "Cartão";
  return "PIX";
}

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

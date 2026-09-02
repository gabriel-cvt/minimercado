import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban,
  Banknote,
  ChevronDown,
  ClipboardList,
  Clock,
  Flame,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Minus,
  Pencil,
  Package,
  PackageCheck,
  Plus,
  ChefHat,
  QrCode,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  cancelOrder,
  finishOrder,
  getOrder,
  getAllOrders,
  getAllProducts,
  markOrderPaid,
  markOrderReady,
  updateOrder,
  type ApiOrder,
  type ApiPaymentMethod,
  type ApiProduct,
} from "@/lib/api";
import { formatBRL, formatDateTime, formatPhone, formatTime } from "@/lib/format";
import type { ApiOrderStatus, OrderRealtimeEvent } from "@/websocket/websocket-types";
import { useOrdersSocket } from "@/websocket/websocket-hooks";
import {
  clearSuppressedRealtimeToast,
  suppressNextRealtimeToast,
} from "@/websocket/websocket-events";
import { fuzzyFilterByName, normalizeSearchText } from "@/lib/fuzzy-search";

const statusConfig: Record<
  ApiOrderStatus,
  { label: string; color: string; bg: string; Icon: typeof Flame }
> = {
  PENDING: {
    label: "Em preparo",
    color: "text-status-preparing",
    bg: "bg-status-preparing/15",
    Icon: Flame,
  },
  READY_FOR_PICKUP: {
    label: "Pronto",
    color: "text-status-assembly",
    bg: "bg-status-assembly/15",
    Icon: Package,
  },
  FINISHED: {
    label: "Finalizado",
    color: "text-status-finished",
    bg: "bg-status-finished/15",
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-destructive",
    bg: "bg-destructive/15",
    Icon: XCircle,
  },
};

type OrderDetailsMode = "active" | "all";
const ORDER_LIST_PAGE_SIZE = 100;

export function OrderDetails({ mode = "active" }: { mode?: OrderDetailsMode }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [listPage, setListPage] = useState(0);
  const [orderSearch, setOrderSearch] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiOrder | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ApiPaymentMethod>("PIX");
  const [, force] = useState(0);
  const ordersQuery = useQuery({
    queryKey: ["orders", "details", mode],
    queryFn: () => getOrdersForDetails(mode),
  });
  const exportMutation = useMutation({
    mutationFn: () => getAllOrders({ sort: "orderTime,desc" }),
    onSuccess: (ordersToExport) => {
      exportOrdersCsv(ordersToExport);
      toast.success(`${ordersToExport.length} pedido(s) exportado(s)`);
    },
    onError: (error) =>
      toast.error(actionError(error, "Não foi possível exportar os pedidos."), {
        duration: Infinity,
      }),
  });
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const normalizedOrderSearch = normalizeSearchText(orderSearch);
  const orderSearchDigits = orderSearch.replace(/\D/g, "");
  const hasOrderSearch =
    mode === "all" && (normalizedOrderSearch.length > 0 || orderSearchDigits.length > 0);
  const visibleOrders = useMemo(
    () =>
      mode === "active"
        ? orders.filter(isActiveOrder)
        : orders.filter((order) =>
            matchesOrderSearch(order, normalizedOrderSearch, orderSearchDigits),
          ),
    [mode, normalizedOrderSearch, orderSearchDigits, orders],
  );
  const listPageCount = Math.max(1, Math.ceil(visibleOrders.length / ORDER_LIST_PAGE_SIZE));
  const currentListPage = Math.min(listPage, listPageCount - 1);
  const paginatedOrders = useMemo(
    () =>
      visibleOrders.slice(
        currentListPage * ORDER_LIST_PAGE_SIZE,
        (currentListPage + 1) * ORDER_LIST_PAGE_SIZE,
      ),
    [currentListPage, visibleOrders],
  );
  const hasLiveOrders = visibleOrders.some(isActiveOrder);
  const detailQuery = useQuery({
    queryKey: ["orders", "detail", selectedId],
    queryFn: () => getOrder(selectedId!),
    enabled: selectedId !== null,
  });

  useEffect(() => {
    if (!hasLiveOrders) return;
    const timer = setInterval(() => force((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [hasLiveOrders]);

  useEffect(() => {
    setListPage(0);
  }, [mode, normalizedOrderSearch, orderSearchDigits]);

  useEffect(() => {
    if (listPage > listPageCount - 1) {
      setListPage(Math.max(0, listPageCount - 1));
    }
  }, [listPage, listPageCount]);

  useEffect(() => {
    if (paginatedOrders.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    if (selectedId === null || !paginatedOrders.some((order) => order.id === selectedId)) {
      setSelectedId(paginatedOrders[0].id);
    }
  }, [paginatedOrders, selectedId]);

  useEffect(() => {
    setActionsOpen(false);
    setConfirmFinish(false);
    setConfirmPayment(false);
    setConfirmCancel(false);
    setEditTarget(null);
  }, [selectedId]);

  const refreshForEvent = useCallback(
    (event: OrderRealtimeEvent) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (event.orderId === selectedId) {
        void queryClient.invalidateQueries({ queryKey: ["orders", "detail", selectedId] });
      }
    },
    [queryClient, selectedId],
  );
  useOrdersSocket(refreshForEvent);

  const finishMutation = useMutation({
    mutationFn: finishOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(["orders", "detail", order.id], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Pedido #${order.id} finalizado`);
      setConfirmFinish(false);
    },
    onError: (error) =>
      toast.error(actionError(error, "Não foi possível finalizar o pedido."), {
        duration: Infinity,
      }),
  });
  const readyMutation = useMutation({
    mutationFn: (id: number) => {
      suppressNextRealtimeToast(id, "pickup");
      return markOrderReady(id);
    },
    onSuccess: async (order) => {
      queryClient.setQueryData(["orders", "detail", order.id], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Pedido #${order.id} marcado como pronto`);
    },
    onError: async (error, id) => {
      clearSuppressedRealtimeToast(id, "pickup");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error(actionError(error, "Não foi possível marcar o pedido como pronto."), {
        duration: Infinity,
      });
    },
  });
  const paymentMutation = useMutation({
    mutationFn: ({ id, method }: { id: number; method: ApiPaymentMethod }) =>
      markOrderPaid(id, method),
    onSuccess: async (order) => {
      queryClient.setQueryData(["orders", "detail", order.id], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Pagamento do pedido #${order.id} confirmado`);
      setConfirmPayment(false);
    },
    onError: (error) =>
      toast.error(actionError(error, "Não foi possível confirmar o pagamento."), {
        duration: Infinity,
      }),
  });
  const editMutation = useMutation({
    mutationFn: ({
      order,
      items,
      customerName,
      customerPhoneNumber,
      customerTeam,
      observation,
    }: {
      order: ApiOrder;
      items: {
        productId: number;
        quantity: number;
        selectedVariantId?: number;
        selectedVariantIds?: number[];
      }[];
      customerName?: string;
      customerPhoneNumber?: string;
      customerTeam?: string;
      observation?: string;
    }) => {
      suppressNextRealtimeToast(order.id, "kitchen:UPDATED");
      return updateOrder(order.id, {
        items,
        customerName,
        customerPhoneNumber,
        customerTeam,
        observation,
      });
    },
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(["orders", "detail", updated.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(
        variables.order.status === "READY_FOR_PICKUP"
          ? `Pedido #${updated.id} atualizado e reenviado para a cozinha`
          : `Pedido #${updated.id} atualizado`,
      );
      setEditTarget(null);
    },
    onError: async (error, variables) => {
      clearSuppressedRealtimeToast(variables.order.id, "kitchen:UPDATED");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error(actionError(error, "Não foi possível editar o pedido."), {
        duration: Infinity,
      });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => {
      suppressNextRealtimeToast(id, "kitchen:CANCELLED");
      return cancelOrder(id);
    },
    onSuccess: async (order) => {
      queryClient.setQueryData(["orders", "detail", order.id], order);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Pedido #${order.id} cancelado`);
      setConfirmCancel(false);
    },
    onError: async (error, id) => {
      clearSuppressedRealtimeToast(id, "kitchen:CANCELLED");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error(actionError(error, "Não foi possível cancelar o pedido."), {
        duration: Infinity,
      });
    },
  });

  const selected = detailQuery.data ?? orders.find((order) => order.id === selectedId);
  const visibleSelected = selected && (mode === "all" || isActiveOrder(selected)) ? selected : null;
  const activeCount = orders.filter(isActiveOrder).length;
  const closedCount = orders.length - activeCount;
  const title = mode === "active" ? "Detalhamento de Pedidos" : "Todos os Pedidos";
  const subtitle =
    mode === "active"
      ? `${activeCount} pedido(s) ativo(s)`
      : `${orders.length} pedido(s) carregado(s) · ${closedCount} encerrado(s)${hasOrderSearch ? ` · ${visibleOrders.length} resultado(s)` : ""}`;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
            <ClipboardList className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {mode === "all" && (
          <button
            type="button"
            onClick={() => exportMutation.mutate()}
            disabled={ordersQuery.isLoading || orders.length === 0 || exportMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-bold shadow-card transition-colors hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportMutation.isPending ? "Exportando..." : "Exportar planilha"}
          </button>
        )}
      </div>

      {mode === "all" && (
        <div className="mb-6 max-w-xl">
          <label className="relative block">
            <span className="sr-only">Buscar pedidos por nome, telefone ou número</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Buscar por nome, telefone ou número"
              className="input h-12 pl-12 pr-12 font-semibold"
            />
            {orderSearch && (
              <button
                type="button"
                onClick={() => setOrderSearch("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
      )}

      {ordersQuery.isLoading ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-muted-foreground">
          Carregando pedidos...
        </div>
      ) : ordersQuery.isError ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-destructive">
          Não foi possível carregar os pedidos.
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="bg-card rounded-3xl border p-16 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold mb-1">
            {hasOrderSearch
              ? "Nenhum pedido encontrado"
              : mode === "active"
                ? "Nenhum pedido ativo"
                : "Nenhum pedido ainda"}
          </p>
          <p className="text-muted-foreground">
            {hasOrderSearch
              ? "Tente buscar por outro nome, telefone ou número."
              : mode === "active"
                ? "Pedidos finalizados e cancelados ficam na aba Todos os Pedidos."
                : "Crie um pedido na aba de realização para visualizá-lo aqui."}
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-3">
            <div className="space-y-3 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {paginatedOrders.map((order) => (
                  <OrderListButton
                    key={order.id}
                    order={order}
                    selected={order.id === selectedId}
                    showOrderDateTime={mode === "all"}
                    onClick={() => setSelectedId(order.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
            {listPageCount > 1 && (
              <OrderListPagination
                currentPage={currentListPage}
                pageCount={listPageCount}
                totalItems={visibleOrders.length}
                onPrevious={() => setListPage((current) => Math.max(0, current - 1))}
                onNext={() => setListPage((current) => Math.min(listPageCount - 1, current + 1))}
              />
            )}
          </div>

          {visibleSelected && (
            <motion.div
              key={visibleSelected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl shadow-card border p-6 md:p-8 lg:max-h-[calc(100vh-260px)] overflow-y-auto"
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <p className="text-muted-foreground text-sm font-semibold">Pedido</p>
                  <h2 className="text-4xl font-black">#{visibleSelected.id}</h2>
                  <p className="text-muted-foreground mt-1">
                    {orderCustomerLabel(visibleSelected)} ·{" "}
                    {mode === "all"
                      ? formatDateTime(visibleSelected.orderTime)
                      : formatTime(visibleSelected.orderTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Total
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {formatBRL(visibleSelected.totalValue)}
                  </p>
                  <p
                    className={`text-xs font-semibold mt-1 ${visibleSelected.paymentStatus === "PAID" ? "text-status-finished" : "text-destructive"}`}
                  >
                    {paymentStatusLabel(visibleSelected)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {visibleSelected.items.map((item, index) => {
                  const variantNames = selectedVariantNamesForItem(item);
                  const variantKey = selectedVariantIdsForItem(item).join("-") || "base";
                  return (
                    <div
                      key={`${item.productId}-${variantKey}-${index}`}
                      className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                        <ChefHat className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{item.productName}</p>
                        {variantNames.length > 0 && (
                          <p className="text-xs font-bold text-primary">
                            {variantNames.join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="bg-primary/10 text-primary font-black px-3 py-1 rounded-lg">
                        x{item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
              {visibleSelected.observation && (
                <div className="mb-6 rounded-xl border border-status-preparing/30 bg-status-preparing/10 p-4">
                  <p className="text-xs font-black uppercase text-status-assembly mb-1">
                    Observação
                  </p>
                  <p className="text-sm font-semibold">{visibleSelected.observation}</p>
                </div>
              )}

              <div className="space-y-3">
                <OrderActionMenu
                  order={visibleSelected}
                  open={actionsOpen}
                  onToggle={() => setActionsOpen((open) => !open)}
                  onEdit={() => {
                    setActionsOpen(false);
                    setEditTarget(visibleSelected);
                  }}
                  onPay={() => {
                    setActionsOpen(false);
                    setPaymentMethod(visibleSelected.paymentMethod ?? "PIX");
                    setConfirmPayment(true);
                  }}
                  onReady={() => {
                    setActionsOpen(false);
                    readyMutation.mutate(visibleSelected.id);
                  }}
                  onFinish={() => {
                    setActionsOpen(false);
                    setConfirmFinish(true);
                  }}
                  onCancel={() => {
                    setActionsOpen(false);
                    setConfirmCancel(true);
                  }}
                />
                <StatusNotice status={visibleSelected.status} />
              </div>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editTarget && (
          <EditOrderModal
            order={editTarget}
            pending={editMutation.isPending}
            onClose={() => setEditTarget(null)}
            onSubmit={(items, billing, observation) =>
              editMutation.mutate({ order: editTarget, items, ...billing, observation })
            }
          />
        )}
        {confirmPayment && visibleSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-sm w-full p-6"
            >
              <h3 className="text-xl font-black mb-2">Confirmar pagamento #{visibleSelected.id}</h3>
              <p className="text-muted-foreground text-sm mb-5">
                Informe a forma recebida para registrar {formatBRL(visibleSelected.totalValue)}.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <PaymentMethodButton
                  method="PIX"
                  selected={paymentMethod === "PIX"}
                  onSelect={setPaymentMethod}
                />
                <PaymentMethodButton
                  method="DINHEIRO"
                  selected={paymentMethod === "DINHEIRO"}
                  onSelect={setPaymentMethod}
                />
                <PaymentMethodButton
                  method="CARTAO"
                  selected={paymentMethod === "CARTAO"}
                  onSelect={setPaymentMethod}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPayment(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    paymentMutation.mutate({ id: visibleSelected.id, method: paymentMethod })
                  }
                  disabled={paymentMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {confirmFinish && visibleSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmFinish(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-sm p-6 text-center"
            >
              <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-status-finished" />
              <h3 className="text-xl font-black mb-2">Finalizar pedido #{visibleSelected.id}?</h3>
              <p className="text-muted-foreground text-sm mb-5">
                {visibleSelected.paymentStatus === "PENDING"
                  ? "O pedido será retirado e continuará com pagamento pendente nos resultados."
                  : "O pedido será encerrado após a retirada."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmFinish(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => finishMutation.mutate(visibleSelected.id)}
                  disabled={finishMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-status-finished text-white font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {confirmCancel && visibleSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmCancel(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-md p-6 text-center"
            >
              <XCircle className="w-14 h-14 mx-auto mb-4 text-destructive" />
              <h3 className="text-xl font-black mb-2">Cancelar pedido #{visibleSelected.id}?</h3>
              <p className="text-muted-foreground text-sm mb-3">
                O pedido será retirado da operação e deixará de contar nas vendas do produto.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Voltar
                </button>
                <button
                  onClick={() => cancelMutation.mutate(visibleSelected.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-destructive text-white font-bold disabled:opacity-50"
                >
                  Confirmar cancelamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderActionMenu({
  order,
  open,
  onToggle,
  onEdit,
  onPay,
  onReady,
  onFinish,
  onCancel,
}: {
  order: ApiOrder;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPay: () => void;
  onReady: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const active = order.status === "PENDING" || order.status === "READY_FOR_PICKUP";
  const canEdit = active && order.paymentStatus !== "PAID";
  const canPay = order.paymentStatus === "PENDING" && order.status !== "CANCELLED";
  const canReady = order.status === "PENDING";
  const canFinish = order.status === "READY_FOR_PICKUP";
  const canCancel = active && order.paymentStatus !== "PAID";

  return (
    <div className="rounded-2xl border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-3 bg-foreground text-background font-bold"
        aria-expanded={open}
      >
        <span>Ações do pedido</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 grid sm:grid-cols-2 gap-2 bg-muted/30">
              <ActionButton
                Icon={Pencil}
                title="Editar pedido"
                detail={
                  order.paymentStatus === "PAID"
                    ? "Pedido pago exige ajuste"
                    : order.status === "READY_FOR_PICKUP"
                      ? "Retorna para a cozinha"
                      : canEdit
                        ? "Itens do pedido"
                        : "Pedido encerrado"
                }
                enabled={canEdit}
                onClick={onEdit}
              />
              <ActionButton
                Icon={Banknote}
                title="Marcar como pago"
                detail={canPay ? "Registrar recebimento" : "Pagamento indisponível"}
                enabled={canPay}
                onClick={onPay}
              />
              <ActionButton
                Icon={PackageCheck}
                title="Marcar pronto"
                detail={canReady ? "Enviar para retirada" : "Apenas em preparo"}
                enabled={canReady}
                onClick={onReady}
              />
              <ActionButton
                Icon={CheckCircle2}
                title="Finalizar"
                detail={canFinish ? "Confirmar retirada" : "Apenas quando pronto"}
                enabled={canFinish}
                onClick={onFinish}
              />
              <ActionButton
                Icon={Ban}
                title="Cancelar pedido"
                detail={
                  order.paymentStatus === "PAID"
                    ? "Pedido pago exige estorno"
                    : canCancel
                      ? "Remove das vendas"
                      : "Cancelamento indisponível"
                }
                enabled={canCancel}
                destructive
                onClick={onCancel}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  Icon,
  title,
  detail,
  enabled,
  destructive = false,
  onClick,
}: {
  Icon: typeof Pencil;
  title: string;
  detail: string;
  enabled: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`rounded-xl border bg-card p-3 text-left flex items-start gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        destructive && enabled
          ? "hover:bg-destructive/10 hover:border-destructive/30"
          : "hover:bg-muted"
      }`}
    >
      <Icon
        className={`w-5 h-5 mt-0.5 shrink-0 ${destructive ? "text-destructive" : "text-primary"}`}
      />
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{detail}</span>
      </span>
    </button>
  );
}

type EditableOrderLine = {
  key: string;
  productId: number;
  quantity: number;
  unitPrice: number;
  selectedVariantId?: number;
  selectedVariantIds: number[];
  selectedVariantName?: string | null;
  selectedVariantNames: string[];
};

function EditOrderModal({
  order,
  pending,
  onClose,
  onSubmit,
}: {
  order: ApiOrder;
  pending: boolean;
  onClose: () => void;
  onSubmit: (
    items: {
      productId: number;
      quantity: number;
      selectedVariantId?: number;
      selectedVariantIds?: number[];
    }[],
    billing: {
      customerName?: string;
      customerPhoneNumber?: string;
      customerTeam?: string;
    },
    observation?: string,
  ) => void;
}) {
  const [customerName, setCustomerName] = useState(order.customerName ?? "");
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState(order.customerPhoneNumber ?? "");
  const [customerTeam, setCustomerTeam] = useState(order.customerTeam ?? "");
  const [search, setSearch] = useState("");
  const [observation, setObservation] = useState(order.observation ?? "");
  const [choosingVariantFor, setChoosingVariantFor] = useState<number | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<Record<number, number[]>>({});
  const [lines, setLines] = useState<EditableOrderLine[]>(
    order.items.map((item, index) => ({
      key: `current-${index}`,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedVariantId: item.selectedVariantId ?? undefined,
      selectedVariantIds: selectedVariantIdsForItem(item),
      selectedVariantName: item.selectedVariantName,
      selectedVariantNames: selectedVariantNamesForItem(item),
    })),
  );
  const productsQuery = useQuery({
    queryKey: ["products", "order-edit"],
    queryFn: () => getAllProducts({ sort: "name,asc" }),
  });
  const products = useMemo(() => {
    const catalogProducts = productsQuery.data ?? [];
    const productIds = new Set(catalogProducts.map((product) => product.id));
    return [...catalogProducts, ...buildMissingHistoricalProducts(order, productIds)];
  }, [order, productsQuery.data]);
  const initialQuantity = (productId: number) =>
    order.items
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);
  const requestedQuantity = (productId: number) =>
    lines
      .filter((line) => line.productId === productId)
      .reduce((total, line) => total + line.quantity, 0);
  const visibleProducts = useMemo(
    () =>
      fuzzyFilterByName(
        products.filter((product) => product.available),
        search,
      ),
    [products, search],
  );
  const requestedItems = lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      selectedVariantId: line.selectedVariantId,
      selectedVariantIds: line.selectedVariantIds,
    }));
  const projectedTotal = lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const requiresBillingData = order.paymentMethod === null;
  const billingIsValid =
    !requiresBillingData ||
    (customerName.trim().length >= 3 &&
      customerPhoneNumber.replace(/\D/g, "").length > 0 &&
      customerTeam.trim().length > 0);
  const variantsAreValid = requestedItems.every((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return (
      !product?.hasVariants ||
      !product.variantSelectionRequired ||
      item.selectedVariantIds.length > 0
    );
  });

  function adjustQuantity(line: EditableOrderLine, product: ApiProduct, difference: number) {
    const nextQuantity = line.quantity + difference;
    const wouldIncreaseDisabledProduct =
      !product.available &&
      requestedQuantity(product.id) + difference > initialQuantity(product.id);
    if (nextQuantity < 0 || wouldIncreaseDisabledProduct) return;
    setLines((current) =>
      nextQuantity === 0
        ? current.filter((entry) => entry.key !== line.key)
        : current.map((entry) =>
            entry.key === line.key ? { ...entry, quantity: nextQuantity } : entry,
          ),
    );
  }

  function addLine(product: ApiProduct, selectedVariantIds: number[] = []) {
    if (!product.available) return;
    const normalizedIds =
      product.variantSelectionMode === "MULTIPLE"
        ? selectedVariantIds
        : selectedVariantIds.slice(0, 1);
    const selectedVariants = normalizedIds
      .map((variantId) => product.variants.find((variant) => variant.id === variantId))
      .filter((variant): variant is ApiProduct["variants"][number] => Boolean(variant));
    setLines((current) => [
      ...current,
      {
        key: `new-${product.id}-${normalizedIds.join("-") || "base"}-${current.length}`,
        productId: product.id,
        quantity: 1,
        unitPrice: findHistoricalUnitPrice(order, product.id, normalizedIds) ?? product.price,
        selectedVariantId: normalizedIds[0],
        selectedVariantIds: normalizedIds,
        selectedVariantName: selectedVariants[0]?.name,
        selectedVariantNames: selectedVariants.map((variant) => variant.name),
      },
    ]);
    setChoosingVariantFor(null);
    setVariantDrafts((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
  }

  function selectLineVariant(line: EditableOrderLine, selectedVariantId?: number) {
    selectLineVariants(line, selectedVariantId ? [selectedVariantId] : []);
  }

  function selectLineVariants(line: EditableOrderLine, selectedVariantIds: number[]) {
    const product = products.find((entry) => entry.id === line.productId);
    const normalizedIds =
      product?.variantSelectionMode === "MULTIPLE"
        ? selectedVariantIds
        : selectedVariantIds.slice(0, 1);
    const selectedVariants =
      product?.variants.filter((variant) => normalizedIds.includes(variant.id)) ?? [];
    const historicalPrice = findHistoricalUnitPrice(order, line.productId, normalizedIds);
    setLines((current) =>
      current.map((entry) =>
        entry.key === line.key
          ? {
              ...entry,
              selectedVariantId: normalizedIds[0],
              selectedVariantIds: normalizedIds,
              selectedVariantName: selectedVariants[0]?.name,
              selectedVariantNames: selectedVariants.map((variant) => variant.name),
              unitPrice: historicalPrice ?? product?.price ?? entry.unitPrice,
            }
          : entry,
      ),
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
        className="bg-card rounded-t-3xl md:rounded-3xl shadow-elegant w-full max-w-3xl max-h-[94vh] flex flex-col"
      >
        <div className="p-5 md:p-6 border-b flex justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-black">Editar pedido #{order.id}</h3>
            <p className="text-sm text-muted-foreground">
              Ajuste produtos e observações do pedido.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar edição"
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {order.status === "READY_FOR_PICKUP" && (
          <div className="mx-5 md:mx-6 mt-4 rounded-xl bg-status-preparing/15 text-status-preparing px-4 py-3 text-sm font-bold">
            Ao salvar, este pedido pronto volta para a cozinha para um novo preparo.
          </div>
        )}

        <div className="p-5 md:p-6 space-y-5 overflow-y-auto">
          {requiresBillingData && (
            <div className="grid gap-3 rounded-2xl border bg-muted/40 p-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">Nome</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">Telefone</span>
                <input
                  value={formatPhone(customerPhoneNumber)}
                  onChange={(event) =>
                    setCustomerPhoneNumber(event.target.value.replace(/\D/g, ""))
                  }
                  inputMode="tel"
                  className="input"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">Equipe</span>
                <input
                  value={customerTeam}
                  onChange={(event) => setCustomerTeam(event.target.value)}
                  className="input"
                />
              </label>
              {!billingIsValid && (
                <span className="text-xs text-destructive font-semibold md:col-span-3">
                  Informe nome, telefone e equipe para manter o pedido fiado.
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pagamentos são alterados pela ação "Marcar como pago", separada da edição.
          </p>
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">Observação do pedido</span>
            <textarea
              value={observation}
              onChange={(event) => setObservation(event.target.value.slice(0, 500))}
              rows={2}
              placeholder="Ex: sem molho, retirar cebola..."
              className="input min-h-20 resize-none"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Buscar item para edição</span>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto para adicionar"
              className="input pl-10"
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Itens selecionados
            </p>
            {lines.map((line) => {
              const product = products.find((entry) => entry.id === line.productId);
              if (!product) return null;
              return (
                <div
                  key={line.key}
                  className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(line.unitPrice)}</p>
                    {product.hasVariants &&
                      (product.variantSelectionMode === "MULTIPLE" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {product.variants.map((variant) => {
                            const checked = line.selectedVariantIds.includes(variant.id);
                            return (
                              <label
                                key={variant.id}
                                className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${
                                  checked ? "border-primary bg-primary/10 text-primary" : "bg-card"
                                } ${!variant.available && !checked ? "opacity-45" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!variant.available && !checked}
                                  onChange={(event) =>
                                    selectLineVariants(
                                      line,
                                      event.target.checked
                                        ? [...line.selectedVariantIds, variant.id]
                                        : line.selectedVariantIds.filter(
                                            (variantId) => variantId !== variant.id,
                                          ),
                                    )
                                  }
                                  className="mr-2 size-3 accent-primary"
                                />
                                {variant.name}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <select
                          value={line.selectedVariantId ?? ""}
                          onChange={(event) =>
                            selectLineVariant(
                              line,
                              event.target.value === "" ? undefined : Number(event.target.value),
                            )
                          }
                          className="mt-2 h-10 rounded-lg border bg-card px-2 text-xs font-bold"
                        >
                          {!product.variantSelectionRequired && (
                            <option value="">Sem {product.variantType?.toLowerCase()}</option>
                          )}
                          {product.variantSelectionRequired && (
                            <option value="">Selecione...</option>
                          )}
                          {product.variants.map((variant) => (
                            <option
                              key={variant.id}
                              value={variant.id}
                              disabled={!variant.available && line.selectedVariantId !== variant.id}
                            >
                              {variant.name}
                              {!variant.available ? " (indisponível)" : ""}
                            </option>
                          ))}
                        </select>
                      ))}
                  </div>
                  <div className="rounded-lg bg-muted flex items-center p-1 gap-2">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(line, product, -1)}
                      aria-label={`Remover uma unidade de ${product.name}`}
                      className="w-9 h-9 bg-card rounded-lg flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-black">{line.quantity}</span>
                    <button
                      type="button"
                      disabled={
                        (!product.available &&
                          requestedQuantity(product.id) >= initialQuantity(product.id)) ||
                        (product.hasVariants &&
                          line.selectedVariantIds.some(
                            (variantId) =>
                              product.variants.find((variant) => variant.id === variantId)
                                ?.available === false,
                          ))
                      }
                      onClick={() => adjustQuantity(line, product, 1)}
                      aria-label={`Adicionar uma unidade de ${product.name}`}
                      className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && (
              <p className="rounded-xl bg-muted py-6 text-center text-sm text-muted-foreground">
                Adicione ao menos um produto.
              </p>
            )}
          </div>

          {productsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
          )}
          {productsQuery.isError && (
            <p className="text-sm text-destructive">Não foi possível carregar o catálogo.</p>
          )}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Adicionar produto
            </p>
            {visibleProducts.map((product) => {
              const cannotAdd =
                !product.available ||
                (product.hasVariants &&
                  product.variantSelectionRequired &&
                  !product.variants.some((variant) => variant.available));
              return (
                <div key={product.id} className="rounded-xl border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBRL(product.price)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={cannotAdd}
                      onClick={() =>
                        product.hasVariants
                          ? setChoosingVariantFor(
                              choosingVariantFor === product.id ? null : product.id,
                            )
                          : addLine(product)
                      }
                      className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      Adicionar
                    </button>
                  </div>
                  {choosingVariantFor === product.id && (
                    <div className="rounded-lg bg-muted p-2">
                      {product.variantSelectionMode === "MULTIPLE" ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {product.variants
                              .filter((variant) => variant.available)
                              .map((variant) => {
                                const selectedIds = variantDrafts[product.id] ?? [];
                                const checked = selectedIds.includes(variant.id);
                                return (
                                  <label
                                    key={variant.id}
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                      checked
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "bg-card"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        setVariantDrafts((current) => ({
                                          ...current,
                                          [product.id]: event.target.checked
                                            ? [...selectedIds, variant.id]
                                            : selectedIds.filter(
                                                (variantId) => variantId !== variant.id,
                                              ),
                                        }))
                                      }
                                      className="mr-2 size-3 accent-primary"
                                    />
                                    {variant.name}
                                  </label>
                                );
                              })}
                          </div>
                          <button
                            type="button"
                            disabled={
                              product.variantSelectionRequired &&
                              (variantDrafts[product.id] ?? []).length === 0
                            }
                            onClick={() => addLine(product, variantDrafts[product.id] ?? [])}
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-40"
                          >
                            Adicionar combinação
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {!product.variantSelectionRequired && (
                            <button
                              type="button"
                              onClick={() => addLine(product)}
                              className="rounded-lg bg-card border px-3 py-2 text-xs font-bold"
                            >
                              Sem {product.variantType?.toLowerCase()}
                            </button>
                          )}
                          {product.variants
                            .filter((variant) => variant.available)
                            .map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() => addLine(product, [variant.id])}
                                className="rounded-lg bg-card border px-3 py-2 text-xs font-bold"
                              >
                                {variant.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!productsQuery.isLoading && visibleProducts.length === 0 && (
              <p className="rounded-xl bg-muted py-8 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado.
              </p>
            )}
          </div>
        </div>
        <div className="p-5 md:p-6 border-t flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
          <p className="text-lg font-black text-primary">
            Total atualizado: {formatBRL(projectedTotal)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border font-bold"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={
                pending ||
                !billingIsValid ||
                !variantsAreValid ||
                requestedItems.length === 0 ||
                productsQuery.isError
              }
              onClick={() =>
                onSubmit(
                  requestedItems,
                  requiresBillingData
                    ? {
                        customerName: customerName.trim(),
                        customerPhoneNumber: customerPhoneNumber.replace(/\D/g, ""),
                        customerTeam: customerTeam.trim(),
                      }
                    : {},
                  observation.trim() || undefined,
                )
              }
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
            >
              {pending ? "Salvando..." : "Salvar edição"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PaymentMethodButton({
  method,
  selected,
  onSelect,
}: {
  method: ApiPaymentMethod;
  selected: boolean;
  onSelect: (method: ApiPaymentMethod) => void;
}) {
  const Icon = method === "PIX" ? QrCode : method === "CARTAO" ? CreditCard : Banknote;
  return (
    <button
      onClick={() => onSelect(method)}
      className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
    >
      <Icon className="w-6 h-6" /> {paymentLabel(method)}
    </button>
  );
}

function OrderListButton({
  order,
  selected,
  showOrderDateTime = false,
  onClick,
}: {
  order: ApiOrder;
  selected: boolean;
  showOrderDateTime?: boolean;
  onClick: () => void;
}) {
  const config = statusConfig[order.status];
  const Icon = config.Icon;
  const elapsedText = orderElapsedText(order);
  const timeText = showOrderDateTime ? formatDateTime(order.orderTime) : elapsedText;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selected ? "border-primary bg-card shadow-elegant" : "border-border bg-card hover:border-primary/40"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-black text-xl">#{order.id}</span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}
        >
          <Icon className="w-3 h-3" /> {config.label}
        </span>
      </div>
      <p className="font-semibold text-sm truncate">{orderCustomerLabel(order)}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        {timeText && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeText}
          </span>
        )}
        <span className="ml-auto">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} itens ·{" "}
          <strong className="text-foreground">{formatBRL(order.totalValue)}</strong>
        </span>
      </div>
    </motion.button>
  );
}

function OrderListPagination({
  currentPage,
  pageCount,
  totalItems,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  pageCount: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card px-3 py-3 shadow-card">
      <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
        Página {currentPage + 1} de {pageCount} · {totalItems} pedido(s)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 0}
          className="rounded-xl border px-3 py-2 text-sm font-bold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= pageCount - 1}
          className="rounded-xl border px-3 py-2 text-sm font-bold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function matchesOrderSearch(order: ApiOrder, normalizedQuery: string, digitQuery: string) {
  if (!normalizedQuery && !digitQuery) return true;

  const customerName = normalizeSearchText(order.customerName ?? "");
  const customerPhone = (order.customerPhoneNumber ?? "").replace(/\D/g, "");
  const orderNumber = String(order.id);

  return (
    (normalizedQuery.length > 0 && customerName.includes(normalizedQuery)) ||
    (digitQuery.length > 0 && customerPhone.includes(digitQuery)) ||
    (digitQuery.length > 0 && orderNumber.includes(digitQuery))
  );
}

function orderCustomerLabel(order: ApiOrder) {
  return order.customerName?.trim() || `Pedido #${order.id}`;
}

function selectedVariantIdsForItem(item: ApiOrder["items"][number]) {
  if (item.selectedVariantIds && item.selectedVariantIds.length > 0) {
    return item.selectedVariantIds;
  }
  return item.selectedVariantId ? [item.selectedVariantId] : [];
}

function selectedVariantNamesForItem(item: ApiOrder["items"][number]) {
  if (item.selectedVariantNames && item.selectedVariantNames.length > 0) {
    return item.selectedVariantNames;
  }
  return item.selectedVariantName ? [item.selectedVariantName] : [];
}

function isActiveOrder(order: ApiOrder) {
  return order.status === "PENDING" || order.status === "READY_FOR_PICKUP";
}

async function getOrdersForDetails(mode: OrderDetailsMode) {
  if (mode === "all") {
    return getAllOrders({ sort: "orderTime,desc" });
  }

  const [pending, ready] = await Promise.all([
    getAllOrders({ status: "PENDING", sort: "orderTime,desc" }),
    getAllOrders({ status: "READY_FOR_PICKUP", sort: "orderTime,desc" }),
  ]);
  return [...pending, ...ready].sort(
    (first, second) => new Date(second.orderTime).getTime() - new Date(first.orderTime).getTime(),
  );
}

function buildMissingHistoricalProducts(order: ApiOrder, knownProductIds: Set<number>) {
  const missingProducts = new Map<number, ApiProduct>();

  order.items.forEach((item) => {
    if (knownProductIds.has(item.productId)) return;

    const variantIds = selectedVariantIdsForItem(item);
    const variantNames = selectedVariantNamesForItem(item);
    const existing = missingProducts.get(item.productId);
    const variants = existing?.variants ? [...existing.variants] : [];
    variantIds.forEach((variantId, index) => {
      if (variants.some((variant) => variant.id === variantId)) return;
      variants.push({
        id: variantId,
        name: variantNames[index] ?? "Opção selecionada",
        available: false,
      });
    });

    const hasVariants = variants.length > 0;
    missingProducts.set(item.productId, {
      id: item.productId,
      name: existing?.name ?? item.productName,
      price: existing?.price ?? item.unitPrice,
      icon: "GENERAL",
      available: false,
      hasVariants,
      variantType: hasVariants ? "Opção" : null,
      variantSelectionRequired: hasVariants,
      variantSelectionMode:
        variantIds.length > 1 || existing?.variantSelectionMode === "MULTIPLE"
          ? "MULTIPLE"
          : "SINGLE",
      variants,
    });
  });

  return [...missingProducts.values()];
}

function findHistoricalUnitPrice(order: ApiOrder, productId: number, selectedVariantIds: number[]) {
  return order.items.find(
    (item) =>
      item.productId === productId && sameIds(selectedVariantIdsForItem(item), selectedVariantIds),
  )?.unitPrice;
}

function sameIds(first: number[], second: number[]) {
  if (first.length !== second.length) return false;
  const normalizedFirst = [...first].sort((a, b) => a - b);
  const normalizedSecond = [...second].sort((a, b) => a - b);
  return normalizedFirst.every((value, index) => value === normalizedSecond[index]);
}

function orderElapsedText(order: ApiOrder) {
  const terminalTimestamp =
    order.status === "FINISHED"
      ? order.finishedAt
      : order.status === "CANCELLED"
        ? order.cancelledAt
        : null;
  const isTerminal = order.status === "FINISHED" || order.status === "CANCELLED";

  if (isTerminal && !terminalTimestamp) return null;

  const start = new Date(order.orderTime).getTime();
  const end = terminalTimestamp ? new Date(terminalTimestamp).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const elapsed = Math.max(0, Math.floor((end - start) / 1000));
  const duration = fmtElapsed(elapsed);
  return isTerminal ? `Duração: ${duration}` : duration;
}

function StatusNotice({ status }: { status: ApiOrderStatus }) {
  const config = statusConfig[status];
  const Icon = config.Icon;
  return (
    <div
      className={`w-full ${config.bg} ${config.color} font-bold py-4 rounded-xl flex items-center justify-center gap-2`}
    >
      <Icon className="w-5 h-5" /> {config.label}
    </div>
  );
}

function fmtElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function paymentLabel(paymentMethod: ApiPaymentMethod | null) {
  return paymentMethod === "PIX"
    ? "PIX"
    : paymentMethod === "DINHEIRO"
      ? "Dinheiro"
      : paymentMethod === "CARTAO"
        ? "Cartão"
        : "Não informado";
}

function paymentStatusLabel(order: ApiOrder) {
  if (order.paymentStatus === "CANCELLED") return "Pagamento cancelado";
  if (order.paymentStatus === "PENDING") return `Pendente - ${paymentLabel(order.paymentMethod)}`;
  return `Pago - ${paymentLabel(order.paymentMethod)}`;
}

function exportOrdersCsv(orders: ApiOrder[]) {
  if (typeof window === "undefined" || orders.length === 0) return;

  const rows = [
    [
      "Pedido",
      "Data do pedido",
      "Pessoa",
      "Equipe",
      "Telefone",
      "Status do pedido",
      "Status do pagamento",
      "Forma de pagamento",
      "Itens",
      "Quantidade total",
      "Observacao",
      "Total",
      "Pago em",
      "Pronto em",
      "Finalizado em",
      "Cancelado em",
    ],
    ...orders.map((order) => [
      `#${order.id}`,
      formatCsvDateTime(order.orderTime),
      order.customerName ?? "Pedido sem fiado",
      order.customerTeam ?? "Nao informada",
      order.customerPhoneNumber ? formatPhone(order.customerPhoneNumber) : "Nao informado",
      statusConfig[order.status].label,
      paymentStatusText(order.paymentStatus),
      paymentLabel(order.paymentMethod),
      order.items.map(formatOrderItemForCsv).join(" | "),
      String(order.items.reduce((sum, item) => sum + item.quantity, 0)),
      order.observation ?? "",
      order.totalValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      formatCsvDateTime(order.paidAt),
      formatCsvDateTime(order.readyAt),
      formatCsvDateTime(order.finishedAt),
      formatCsvDateTime(order.cancelledAt),
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `todos-os-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatOrderItemForCsv(item: ApiOrder["items"][number]) {
  const variants = selectedVariantNamesForItem(item);
  const variantText = variants.length > 0 ? ` (${variants.join(", ")})` : "";
  return `${item.productName}${variantText} x${item.quantity}`;
}

function formatCsvDateTime(value: string | null) {
  return value ? formatDateTime(value) : "";
}

function paymentStatusText(status: ApiOrder["paymentStatus"]) {
  if (status === "PAID") return "Pago";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendente";
}

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
}

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
  Minus,
  Pencil,
  Package,
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
  getOrders,
  getProducts,
  markOrderPaid,
  updateOrder,
  type ApiOrder,
  type ApiPaymentMethod,
  type ApiProduct,
} from "@/lib/api";
import { formatBRL, formatCPF, formatTime, isValidCPF } from "@/lib/format";
import type { ApiOrderStatus, OrderRealtimeEvent } from "@/websocket/websocket-types";
import { useOrdersSocket } from "@/websocket/websocket-hooks";
import {
  clearSuppressedRealtimeToast,
  suppressNextRealtimeToast,
} from "@/websocket/websocket-events";

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

export function OrderDetails() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiOrder | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<ApiPaymentMethod>("PIX");
  const [, force] = useState(0);
  const ordersQuery = useQuery({
    queryKey: ["orders", "details"],
    queryFn: () => getOrders({ size: 100, sort: "orderTime,desc" }),
  });
  const orders = useMemo(() => ordersQuery.data?.content ?? [], [ordersQuery.data]);
  const hasLiveOrders = orders.some(
    (order) => order.status !== "FINISHED" && order.status !== "CANCELLED",
  );
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
    if (selectedId === null && orders[0]) setSelectedId(orders[0].id);
  }, [orders, selectedId]);

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
      clienteCpf,
      observation,
    }: {
      order: ApiOrder;
      items: { productId: number; quantity: number; selectedVariantId?: number }[];
      clienteCpf: string;
      observation?: string;
    }) => {
      suppressNextRealtimeToast(order.id, "kitchen:UPDATED");
      return updateOrder(order.id, { items, clienteCpf, observation });
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
      toast.success(`Pedido #${order.id} cancelado e estoque devolvido`);
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
  const active = orders.filter(
    (order) => order.status === "PENDING" || order.status === "READY_FOR_PICKUP",
  );
  const closed = orders.filter(
    (order) => order.status === "FINISHED" || order.status === "CANCELLED",
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <ClipboardList className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Detalhamento de Pedidos</h2>
          <p className="text-muted-foreground">
            Visão operacional ao vivo - {active.length} na fila
          </p>
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-muted-foreground">
          Carregando pedidos...
        </div>
      ) : ordersQuery.isError ? (
        <div className="bg-card rounded-3xl border p-16 text-center text-destructive">
          Não foi possível carregar os pedidos.
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-3xl border p-16 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-bold mb-1">Nenhum pedido ainda</p>
          <p className="text-muted-foreground">
            Crie um pedido na aba de realização para visualizá-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-3 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {[...active, ...closed].map((order) => (
                <OrderListButton
                  key={order.id}
                  order={order}
                  selected={order.id === selectedId}
                  onClick={() => setSelectedId(order.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-3xl shadow-card border p-6 md:p-8 lg:max-h-[calc(100vh-260px)] overflow-y-auto"
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <p className="text-muted-foreground text-sm font-semibold">Pedido</p>
                  <h2 className="text-4xl font-black">#{selected.id}</h2>
                  <p className="text-muted-foreground mt-1">
                    {selected.client.name} · {formatTime(selected.orderTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Total
                  </p>
                  <p className="text-3xl font-black text-primary">
                    {formatBRL(selected.totalValue)}
                  </p>
                  <p
                    className={`text-xs font-semibold mt-1 ${selected.paymentStatus === "PAID" ? "text-status-finished" : "text-destructive"}`}
                  >
                    {paymentStatusLabel(selected)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {selected.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.selectedVariantId ?? "base"}`}
                    className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shadow-sm">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{item.productName}</p>
                      {item.selectedVariantName && (
                        <p className="text-xs font-bold text-primary">{item.selectedVariantName}</p>
                      )}
                    </div>
                    <span className="bg-primary/10 text-primary font-black px-3 py-1 rounded-lg">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              {selected.observation && (
                <div className="mb-6 rounded-xl border border-status-preparing/30 bg-status-preparing/10 p-4">
                  <p className="text-xs font-black uppercase text-status-assembly mb-1">
                    Observação
                  </p>
                  <p className="text-sm font-semibold">{selected.observation}</p>
                </div>
              )}

              <div className="space-y-3">
                <OrderActionMenu
                  order={selected}
                  open={actionsOpen}
                  onToggle={() => setActionsOpen((open) => !open)}
                  onEdit={() => {
                    setActionsOpen(false);
                    setEditTarget(selected);
                  }}
                  onPay={() => {
                    setActionsOpen(false);
                    setPaymentMethod(selected.paymentMethod === "DINHEIRO" ? "DINHEIRO" : "PIX");
                    setConfirmPayment(true);
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
                <StatusNotice status={selected.status} />
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
            onSubmit={(items, clienteCpf, observation) =>
              editMutation.mutate({ order: editTarget, items, clienteCpf, observation })
            }
          />
        )}
        {confirmPayment && selected && (
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
              <h3 className="text-xl font-black mb-2">Confirmar pagamento #{selected.id}</h3>
              <p className="text-muted-foreground text-sm mb-5">
                Informe a forma recebida para registrar {formatBRL(selected.totalValue)}.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
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
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPayment(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => paymentMutation.mutate({ id: selected.id, method: paymentMethod })}
                  disabled={paymentMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {confirmFinish && selected && (
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
              <h3 className="text-xl font-black mb-2">Finalizar pedido #{selected.id}?</h3>
              <p className="text-muted-foreground text-sm mb-5">
                {selected.paymentStatus === "PENDING"
                  ? "O pedido será retirado e continuará como pagamento pendente no dashboard."
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
                  onClick={() => finishMutation.mutate(selected.id)}
                  disabled={finishMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-status-finished text-white font-bold disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {confirmCancel && selected && (
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
              <h3 className="text-xl font-black mb-2">Cancelar pedido #{selected.id}?</h3>
              <p className="text-muted-foreground text-sm mb-3">
                O pedido será retirado da operação e suas unidades voltarão ao estoque.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Voltar
                </button>
                <button
                  onClick={() => cancelMutation.mutate(selected.id)}
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
  onFinish,
  onCancel,
}: {
  order: ApiOrder;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPay: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const active = order.status === "PENDING" || order.status === "READY_FOR_PICKUP";
  const canEdit = active && order.paymentStatus !== "PAID";
  const canPay = order.paymentStatus === "PENDING" && order.status !== "CANCELLED";
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
                        ? "Itens e cliente"
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
                      ? "Devolve o estoque"
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
  selectedVariantId?: number;
  selectedVariantName?: string | null;
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
    items: { productId: number; quantity: number; selectedVariantId?: number }[],
    clienteCpf: string,
    observation?: string,
  ) => void;
}) {
  const [cpf, setCpf] = useState(order.client.cpf);
  const [search, setSearch] = useState("");
  const [observation, setObservation] = useState(order.observation ?? "");
  const [choosingVariantFor, setChoosingVariantFor] = useState<number | null>(null);
  const [lines, setLines] = useState<EditableOrderLine[]>(
    order.items.map((item, index) => ({
      key: `current-${index}`,
      productId: item.productId,
      quantity: item.quantity,
      selectedVariantId: item.selectedVariantId ?? undefined,
      selectedVariantName: item.selectedVariantName,
    })),
  );
  const productsQuery = useQuery({
    queryKey: ["products", "order-edit"],
    queryFn: () => getProducts({ size: 500, sort: "name,asc" }),
  });
  const products = useMemo(() => {
    const availableProducts = productsQuery.data?.content ?? [];
    const productIds = new Set(availableProducts.map((product) => product.id));
    const missingCurrentProducts = Array.from(
      new Map(
        order.items
          .filter((item) => !productIds.has(item.productId))
          .map((item) => [
            item.productId,
            {
              id: item.productId,
              name: item.productName,
              price: item.unitPrice,
              stockQuantity: 0,
              hasVariants: item.selectedVariantId !== null,
              variantType: item.selectedVariantId !== null ? "Opção" : null,
              variantSelectionRequired: item.selectedVariantId !== null,
              variants:
                item.selectedVariantId !== null
                  ? [
                      {
                        id: item.selectedVariantId,
                        name: item.selectedVariantName ?? "Opção selecionada",
                        available: true,
                      },
                    ]
                  : [],
            },
          ]),
      ).values(),
    ) satisfies ApiProduct[];
    return [...availableProducts, ...missingCurrentProducts];
  }, [order.items, productsQuery.data?.content]);
  const initialQuantity = (productId: number) =>
    order.items
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);
  const requestedQuantity = (productId: number) =>
    lines
      .filter((line) => line.productId === productId)
      .reduce((total, line) => total + line.quantity, 0);
  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );
  const requestedItems = lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      selectedVariantId: line.selectedVariantId,
    }));
  const projectedTotal = requestedItems.reduce((total, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);
  const cpfIsValid = isValidCPF(cpf);
  const variantsAreValid = requestedItems.every((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return !product?.hasVariants || !product.variantSelectionRequired || item.selectedVariantId;
  });

  function adjustQuantity(line: EditableOrderLine, product: ApiProduct, difference: number) {
    const nextQuantity = line.quantity + difference;
    const maxQuantity = product.stockQuantity + initialQuantity(product.id);
    if (nextQuantity < 0 || requestedQuantity(product.id) + difference > maxQuantity) return;
    setLines((current) =>
      nextQuantity === 0
        ? current.filter((entry) => entry.key !== line.key)
        : current.map((entry) =>
            entry.key === line.key ? { ...entry, quantity: nextQuantity } : entry,
          ),
    );
  }

  function addLine(product: ApiProduct, selectedVariantId?: number) {
    const maxQuantity = product.stockQuantity + initialQuantity(product.id);
    if (requestedQuantity(product.id) >= maxQuantity) return;
    const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
    setLines((current) => [
      ...current,
      {
        key: `new-${product.id}-${selectedVariantId ?? "base"}-${current.length}`,
        productId: product.id,
        quantity: 1,
        selectedVariantId,
        selectedVariantName: selectedVariant?.name,
      },
    ]);
    setChoosingVariantFor(null);
  }

  function selectLineVariant(line: EditableOrderLine, selectedVariantId?: number) {
    const product = products.find((entry) => entry.id === line.productId);
    const selectedVariant = product?.variants.find((variant) => variant.id === selectedVariantId);
    setLines((current) =>
      current.map((entry) =>
        entry.key === line.key
          ? {
              ...entry,
              selectedVariantId,
              selectedVariantName: selectedVariant?.name,
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
              Ajuste produtos ou vincule outro cliente já cadastrado.
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
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">CPF do cliente</span>
            <input
              value={formatCPF(cpf)}
              onChange={(event) => setCpf(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="input font-mono"
            />
            {!cpfIsValid && (
              <span className="text-xs text-destructive font-semibold mt-1.5 block">
                Informe um CPF com 11 dígitos.
              </span>
            )}
          </label>
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
                    <p className="text-xs text-muted-foreground">{formatBRL(product.price)}</p>
                    {product.hasVariants && (
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
                        {product.variantSelectionRequired && <option value="">Selecione...</option>}
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
                    )}
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
                        requestedQuantity(product.id) >=
                          product.stockQuantity + initialQuantity(product.id) ||
                        (product.hasVariants &&
                          product.variants.find((variant) => variant.id === line.selectedVariantId)
                            ?.available === false)
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
              const maxQuantity = product.stockQuantity + initialQuantity(product.id);
              const cannotAdd =
                requestedQuantity(product.id) >= maxQuantity ||
                (product.hasVariants &&
                  product.variantSelectionRequired &&
                  !product.variants.some((variant) => variant.available));
              return (
                <div key={product.id} className="rounded-xl border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(product.price)} · até {maxQuantity} no pedido
                      </p>
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
                    <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-2">
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
                            onClick={() => addLine(product, variant.id)}
                            className="rounded-lg bg-card border px-3 py-2 text-xs font-bold"
                          >
                            {variant.name}
                          </button>
                        ))}
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
                !cpfIsValid ||
                !variantsAreValid ||
                requestedItems.length === 0 ||
                productsQuery.isError
              }
              onClick={() => onSubmit(requestedItems, cpf, observation.trim() || undefined)}
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
  const Icon = method === "PIX" ? QrCode : Banknote;
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
  onClick,
}: {
  order: ApiOrder;
  selected: boolean;
  onClick: () => void;
}) {
  const config = statusConfig[order.status];
  const Icon = config.Icon;
  const elapsedText = orderElapsedText(order);
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
      <p className="font-semibold text-sm truncate">{order.client.name}</p>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        {elapsedText && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {elapsedText}
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
      : "Não informado";
}

function paymentStatusLabel(order: ApiOrder) {
  if (order.paymentStatus === "CANCELLED") return "Pagamento cancelado";
  if (order.paymentStatus === "PENDING") return `Pendente - ${paymentLabel(order.paymentMethod)}`;
  return `Pago - ${paymentLabel(order.paymentMethod)}`;
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    try {
      const detail = (JSON.parse(error.message) as { detail?: string }).detail;
      if (detail) return detail;
    } catch {
      if (error.status === 409) return "Esta ação não é permitida no estado atual do pedido.";
    }
  }
  return fallback;
}

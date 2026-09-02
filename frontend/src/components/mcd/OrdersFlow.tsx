import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Minus,
  Plus,
  ShoppingBag,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  createOrder,
  getAllProducts,
  type ApiOrder,
  type ApiPaymentMethod,
  type ApiProduct,
  type ApiProductVariant,
} from "@/lib/api";
import { formatBRL, formatPhone } from "@/lib/format";
import { fuzzyFilterByName } from "@/lib/fuzzy-search";
import { ProductVisual } from "@/components/mcd/ProductVisual";

type Step = "products" | "success";
type CartLine = {
  key: string;
  product: ApiProduct;
  selectedVariants: ApiProductVariant[];
  qty: number;
};

type PaymentChoice = ApiPaymentMethod | "PENDING";
type StoredCartLine = {
  productId: number;
  selectedVariantId?: number;
  selectedVariantIds?: number[];
  qty: number;
};
type StoredOrderDraft = {
  name: string;
  phoneNumber: string;
  team: string;
  search: string;
  payment: PaymentChoice | null;
  observation: string;
  cart: StoredCartLine[];
};

const ORDER_DRAFT_STORAGE_KEY = "minimercado.orders.active-draft.v2";
const LEGACY_ORDER_DRAFT_STORAGE_KEY = "mcdominus.orders.active-draft.v1";
function readOrderDraft(): StoredOrderDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const currentDraft = window.sessionStorage.getItem(ORDER_DRAFT_STORAGE_KEY);
    const legacyDraft = window.sessionStorage.getItem(LEGACY_ORDER_DRAFT_STORAGE_KEY);
    const raw = currentDraft ?? legacyDraft;
    if (!raw) return null;

    if (!currentDraft && legacyDraft) {
      window.sessionStorage.setItem(ORDER_DRAFT_STORAGE_KEY, legacyDraft);
      window.sessionStorage.removeItem(LEGACY_ORDER_DRAFT_STORAGE_KEY);
    }

    const draft = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof draft.name === "string" ? draft.name : "",
      phoneNumber: typeof draft.phoneNumber === "string" ? draft.phoneNumber : "",
      team: typeof draft.team === "string" ? draft.team : "",
      search: typeof draft.search === "string" ? draft.search : "",
      payment:
        draft.payment === "PIX" ||
        draft.payment === "DINHEIRO" ||
        draft.payment === "CARTAO" ||
        draft.payment === "PENDING"
          ? draft.payment
          : null,
      observation: typeof draft.observation === "string" ? draft.observation : "",
      cart: Array.isArray(draft.cart)
        ? draft.cart.flatMap((line) => {
            const value = line as Partial<StoredCartLine>;
            if (
              !Number.isInteger(value.productId) ||
              !Number.isInteger(value.qty) ||
              Number(value.qty) < 1
            ) {
              return [];
            }
            return [
              {
                productId: Number(value.productId),
                selectedVariantId: Number.isInteger(value.selectedVariantId)
                  ? Number(value.selectedVariantId)
                  : undefined,
                selectedVariantIds: Array.isArray(value.selectedVariantIds)
                  ? value.selectedVariantIds
                      .filter((variantId) => Number.isInteger(variantId))
                      .map(Number)
                  : undefined,
                qty: Number(value.qty),
              },
            ];
          })
        : [],
    };
  } catch {
    return null;
  }
}

function storeOrderDraft(draft: StoredOrderDraft) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ORDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Browsers may deny storage in private or restricted sessions.
  }
}

function clearOrderDraft() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ORDER_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_ORDER_DRAFT_STORAGE_KEY);
  } catch {
    // Keep the order flow usable even when storage is unavailable.
  }
}

export function OrdersFlow() {
  const [step, setStep] = useState<Step>("products");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [payment, setPayment] = useState<PaymentChoice | null>(null);
  const [placedOrder, setPlacedOrder] = useState<ApiOrder | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [variantTarget, setVariantTarget] = useState<ApiProduct | null>(null);
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [cartToRestore, setCartToRestore] = useState<StoredCartLine[] | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const [showNewOrderConfirmation, setShowNewOrderConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products", "available"],
    queryFn: () => getAllProducts({ available: true, sort: "name,asc" }),
  });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  useEffect(() => {
    const draft = readOrderDraft();
    if (draft) {
      setStep("products");
      setName(draft.name);
      setPhoneNumber(draft.phoneNumber);
      setTeam(draft.team);
      setSearch(draft.search);
      setPayment(draft.payment);
      setObservation(draft.observation);
      setCartToRestore(draft.cart);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || cartToRestore === null || !productsQuery.data) return;

    let discardedLines = 0;
    const restoredCart = cartToRestore.flatMap((storedLine) => {
      const product = productsQuery.data.find((item) => item.id === storedLine.productId);
      if (!product || !product.available) {
        discardedLines += 1;
        return [];
      }

      const storedVariantIds =
        storedLine.selectedVariantIds && storedLine.selectedVariantIds.length > 0
          ? storedLine.selectedVariantIds
          : storedLine.selectedVariantId
            ? [storedLine.selectedVariantId]
            : [];
      const selectedVariants = storedVariantIds
        .map((variantId) =>
          product.variants.find((variant) => variant.id === variantId && variant.available),
        )
        .filter((variant): variant is ApiProductVariant => Boolean(variant));
      if (selectedVariants.length !== storedVariantIds.length) {
        discardedLines += 1;
        return [];
      }
      const normalizedVariants =
        product.variantSelectionMode === "MULTIPLE"
          ? selectedVariants
          : selectedVariants.slice(0, 1);
      if (product.variantSelectionRequired && normalizedVariants.length === 0) {
        discardedLines += 1;
        return [];
      }

      return [
        {
          key: lineKey(product, normalizedVariants),
          product,
          selectedVariants: normalizedVariants,
          qty: storedLine.qty,
        },
      ];
    });

    setCart(restoredCart);
    setDraftNotice(
      discardedLines > 0
        ? `${discardedLines} item(ns) do rascunho foram removidos porque o produto ou a opção não está mais disponível.`
        : "",
    );
    setCartToRestore(null);
  }, [cartToRestore, draftHydrated, productsQuery.data]);

  useEffect(() => {
    if (!draftHydrated) return;

    if (step === "success") {
      clearOrderDraft();
      return;
    }

    const isEmptyStart =
      step === "products" &&
      !name &&
      !phoneNumber &&
      !team &&
      !search &&
      !payment &&
      !observation &&
      cart.length === 0 &&
      (cartToRestore?.length ?? 0) === 0;
    if (isEmptyStart) {
      clearOrderDraft();
      return;
    }

    storeOrderDraft({
      name,
      phoneNumber,
      team,
      search,
      payment,
      observation,
      cart:
        cartToRestore ??
        cart.map((line) => ({
          productId: line.product.id,
          selectedVariantId: line.selectedVariants[0]?.id,
          selectedVariantIds: line.selectedVariants.map((variant) => variant.id),
          qty: line.qty,
        })),
    });
  }, [
    cart,
    cartToRestore,
    draftHydrated,
    name,
    observation,
    payment,
    phoneNumber,
    team,
    search,
    step,
  ]);

  const total = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const totalCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const lineKey = (product: ApiProduct, variants: ApiProductVariant[] = []) => {
    const variantKey = variants
      .map((variant) => variant.id)
      .sort((first, second) => first - second)
      .join("-");
    return `${product.id}:${variantKey || "base"}`;
  };

  const quantityForProduct = (productId: number) =>
    cart
      .filter((line) => line.product.id === productId)
      .reduce((totalQuantity, line) => totalQuantity + line.qty, 0);

  const addLine = (product: ApiProduct, selectedVariants: ApiProductVariant[] = []) => {
    const normalizedVariants =
      product.variantSelectionMode === "MULTIPLE" ? selectedVariants : selectedVariants.slice(0, 1);
    const key = lineKey(product, normalizedVariants);
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { key, product, selectedVariants: normalizedVariants, qty: 1 }];
    });
  };

  const removeOneFromProduct = (product: ApiProduct) => {
    setCart((current) => {
      const line = [...current].reverse().find((item) => item.product.id === product.id);
      if (!line) return current;
      return line.qty === 1
        ? current.filter((item) => item.key !== line.key)
        : current.map((item) => (item.key === line.key ? { ...item, qty: item.qty - 1 } : item));
    });
  };

  const selectProduct = (product: ApiProduct) => {
    if (product.hasVariants) {
      setVariantTarget(product);
      return;
    }
    addLine(product);
  };

  const handleFinalize = async () => {
    if (!payment) return;
    if (payment === "PENDING") {
      if (name.trim().length < 3) {
        setError("Informe o nome da pessoa para pedidos fiados.");
        return;
      }
      if (!team) {
        setError("Informe a equipe ou referência da pessoa.");
        return;
      }
      if (!phoneNumber.replace(/\D/g, "")) {
        setError("Informe o telefone da pessoa.");
        return;
      }
    }
    setError("");
    setSubmitting(true);
    try {
      const paymentMethod = payment === "PENDING" ? undefined : payment;
      const createdOrder = await createOrder({
        paymentMethod,
        confirmPayment: paymentMethod !== undefined,
        customerName: payment === "PENDING" ? name.trim() : undefined,
        customerPhoneNumber: payment === "PENDING" ? phoneNumber.replace(/\D/g, "") : undefined,
        customerTeam: payment === "PENDING" ? team : undefined,
        observation: observation.trim() || undefined,
        items: cart.map((line) => ({
          productId: line.product.id,
          quantity: line.qty,
          selectedVariantId: line.selectedVariants[0]?.id,
          selectedVariantIds: line.selectedVariants.map((variant) => variant.id),
        })),
      });
      setPlacedOrder(createdOrder);
      setShowSummary(false);
      setPayment(null);
      setCart([]);
      setName("");
      setPhoneNumber("");
      setTeam("");
      setObservation("");
      clearOrderDraft();
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    clearOrderDraft();
    setStep("products");
    setName("");
    setPhoneNumber("");
    setTeam("");
    setError("");
    setSearch("");
    setShowSummary(false);
    setPayment(null);
    setPlacedOrder(null);
    setCart([]);
    setCartToRestore(null);
    setDraftNotice("");
    setVariantTarget(null);
    setObservation("");
    setShowNewOrderConfirmation(false);
  };

  const startNewOrder = () => {
    if (cart.length > 0 || observation.trim() || payment) {
      setShowNewOrderConfirmation(true);
      return;
    }
    reset();
  };

  const filtered = useMemo(() => fuzzyFilterByName(products, search), [products, search]);

  return (
    <div className="relative pb-32">
      <AnimatePresence mode="wait">
        {step === "products" && (
          <motion.section
            key="prod"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-gradient-hero text-primary-foreground rounded-3xl overflow-hidden shadow-elegant mb-6">
              <div className="px-6 py-10">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-white/90 font-medium">Novo pedido</p>
                    <h1 className="text-4xl md:text-5xl font-black">Monte seu pedido</h1>
                    <p className="mt-2 text-sm text-white/85">
                      Seu pedido em andamento fica salvo nesta aba.
                    </p>
                  </div>
                  <button
                    onClick={startNewOrder}
                    className="shrink-0 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
                  >
                    Novo pedido
                  </button>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-card text-foreground focus:outline-none focus:ring-4 focus:ring-card/30"
                  />
                </div>
              </div>
            </div>
            {productsQuery.isLoading && (
              <p className="mb-5 text-muted-foreground font-medium">Carregando produtos...</p>
            )}
            {cartToRestore !== null && (
              <p className="mb-5 text-primary font-medium">Retomando pedido em andamento...</p>
            )}
            {productsQuery.isError && (
              <p className="mb-5 text-destructive font-medium">
                Não foi possível carregar o catálogo.
              </p>
            )}
            {draftNotice && (
              <p className="mb-5 rounded-xl border border-status-preparing/30 bg-status-preparing/10 px-4 py-3 font-semibold text-status-assembly">
                {draftNotice}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground font-medium">
                  Nenhum produto encontrado.
                </div>
              )}
              {filtered.map((p) => {
                const qty = quantityForProduct(p.id);
                const availableVariants = p.variants.filter((variant) => variant.available);
                const cannotAdd =
                  !p.available ||
                  (p.hasVariants && p.variantSelectionRequired && availableVariants.length === 0);
                return (
                  <motion.div
                    key={p.id}
                    layout
                    whileHover={{ y: -4 }}
                    className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elegant transition-shadow border"
                  >
                    <ProductVisual icon={p.icon} className="aspect-[4/3]" />
                    <div className="p-4">
                      <h3 className="font-bold text-lg leading-tight mb-1">{p.name}</h3>
                      <p className="text-2xl font-black text-primary mb-3">{formatBRL(p.price)}</p>
                      {p.hasVariants && (
                        <p className="text-xs font-semibold text-primary mb-2">
                          {p.variantSelectionMode === "MULTIPLE" ? "Combine" : "Escolha"}{" "}
                          {p.variantType?.toLowerCase()}
                          {!p.variantSelectionRequired && " (opcional)"}
                        </p>
                      )}
                      <div className="flex items-center justify-between bg-muted rounded-xl p-1">
                        <button
                          onClick={() => removeOneFromProduct(p)}
                          disabled={qty === 0}
                          className="w-10 h-10 rounded-lg bg-card shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-foreground transition-colors"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-xl tabular-nums w-10 text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => selectProduct(p)}
                          disabled={cannotAdd}
                          className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow disabled:opacity-40 transition-colors"
                          aria-label="Adicionar"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {totalCount > 0 && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="fixed bottom-0 left-0 right-0 z-40 bg-foreground text-background shadow-elegant"
                >
                  <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-background/70 font-semibold uppercase tracking-wide">
                        {totalCount} {totalCount > 1 ? "itens" : "item"}
                      </p>
                      <p className="text-2xl md:text-3xl font-black">{formatBRL(total)}</p>
                    </div>
                    <button
                      onClick={() => setShowSummary(true)}
                      className="bg-gradient-primary text-primary-foreground font-bold px-6 md:px-8 py-4 rounded-xl shadow-glow hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" /> Finalizar Pedido
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {step === "success" && placedOrder && (
          <motion.section
            key="ok"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center px-6 py-16"
          >
            <div className="bg-card rounded-3xl shadow-elegant p-10 max-w-md w-full text-center border">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-status-finished/20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-12 h-12 text-status-finished" />
              </motion.div>
              <h1 className="text-3xl font-black mb-2">Pedido realizado com sucesso!</h1>
              <p className="text-muted-foreground mb-6">
                Enviado para a cozinha. Acompanhe pelo painel.
              </p>
              <div className="bg-muted rounded-2xl p-5 mb-6 space-y-2 text-left">
                <Row label="Pedido nº" value={`#${placedOrder.id}`} />
                <Row label="Total" value={formatBRL(placedOrder.totalValue)} />
                <Row label="Forma de pagamento" value={paymentLabel(placedOrder.paymentMethod)} />
                <Row label="Situação do pagamento" value={paymentStatusLabel(placedOrder)} />
              </div>
              <button
                onClick={reset}
                className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant hover:scale-[1.02] transition-transform"
              >
                Novo pedido
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setShowSummary(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-elegant"
            >
              <div className="flex shrink-0 items-center justify-between border-b p-6">
                <h2 className="text-2xl font-black">Resumo do pedido</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="space-y-3 p-6">
                  {cart.map((line) => (
                    <div key={line.key} className="flex items-center gap-3">
                      <ProductVisual
                        icon={line.product.icon}
                        className="w-16 h-16 rounded-xl shrink-0"
                        compact
                      />
                      <div className="flex-1">
                        <p className="font-bold">{line.product.name}</p>
                        {line.selectedVariants.length > 0 && (
                          <p className="text-xs font-bold text-primary">
                            {line.product.variantType}:{" "}
                            {line.selectedVariants.map((variant) => variant.name).join(", ")}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {line.qty} × {formatBRL(line.product.price)}
                        </p>
                      </div>
                      <p className="font-black">{formatBRL(line.qty * line.product.price)}</p>
                    </div>
                  ))}
                  <label className="block pt-3">
                    <span className="text-sm font-semibold mb-2 block">
                      Observação do pedido (opcional)
                    </span>
                    <textarea
                      value={observation}
                      onChange={(event) => setObservation(event.target.value.slice(0, 500))}
                      placeholder="Ex: sem molho, retirar cebola..."
                      rows={3}
                      className="input min-h-24 resize-none"
                    />
                    <span className="block text-right text-xs text-muted-foreground">
                      {observation.length}/500
                    </span>
                  </label>
                </div>
                <div className="space-y-4 border-t bg-muted/40 p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Total</span>
                    <span className="text-3xl font-black text-primary">{formatBRL(total)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">Forma de pagamento</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      PIX, Dinheiro e Cartão serão marcados como pagos agora. Fiado fica para
                      cobrança posterior.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { v: "PIX" as const, label: "PIX", Icon: Sparkles },
                        { v: "DINHEIRO" as const, label: "Dinheiro", Icon: Banknote },
                        { v: "CARTAO" as const, label: "Cartão", Icon: CreditCard },
                        { v: "PENDING" as const, label: "Fiado", Icon: Clock },
                      ].map(({ v, label, Icon }) => (
                        <button
                          key={v}
                          onClick={() => setPayment(v)}
                          className={`p-3 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all ${payment === v ? "border-primary bg-primary/10 text-primary scale-105" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <Icon className="w-5 h-5" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {payment === "PENDING" && (
                    <div className="space-y-3 rounded-2xl border bg-card p-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold">Nome da pessoa</span>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Ex: João da Silva"
                          className="input"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold">Telefone</span>
                        <input
                          value={formatPhone(phoneNumber)}
                          onChange={(event) =>
                            setPhoneNumber(event.target.value.replace(/\D/g, ""))
                          }
                          placeholder="(85) 99999-9999"
                          inputMode="tel"
                          className="input"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold">
                          Equipe ou referência
                        </span>
                        <input
                          value={team}
                          onChange={(event) => setTeam(event.target.value)}
                          maxLength={255}
                          placeholder="Ex: Cozinha, empresa ou setor"
                          className="input"
                        />
                      </label>
                    </div>
                  )}
                  {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
                  <button
                    onClick={() => void handleFinalize()}
                    disabled={!payment || submitting}
                    className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" /> Confirmar e Enviar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {variantTarget && (
          <VariantSelectionModal
            product={variantTarget}
            onClose={() => setVariantTarget(null)}
            onSelect={(variants) => {
              addLine(variantTarget, variants);
              setVariantTarget(null);
            }}
          />
        )}
        {showNewOrderConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-5 backdrop-blur-sm"
            onClick={() => setShowNewOrderConfirmation(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-elegant"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-xl font-black">Começar outro pedido?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O pedido atual será descartado, incluindo itens, pagamento e observações ainda não
                enviados.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowNewOrderConfirmation(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Continuar pedido atual
                </button>
                <button
                  onClick={reset}
                  className="rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-elegant"
                >
                  Descartar pedido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VariantSelectionModal({
  product,
  onClose,
  onSelect,
}: {
  product: ApiProduct;
  onClose: () => void;
  onSelect: (variants: ApiProductVariant[]) => void;
}) {
  const availableVariants = product.variants.filter((variant) => variant.available);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isMultiple = product.variantSelectionMode === "MULTIPLE";
  const selectedVariants = selectedIds
    .map((variantId) => availableVariants.find((variant) => variant.id === variantId))
    .filter((variant): variant is ApiProductVariant => Boolean(variant));
  const canConfirm = !product.variantSelectionRequired || selectedVariants.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        exit={{ y: 50 }}
        onClick={(event) => event.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-elegant"
      >
        <div className="flex justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              {isMultiple ? "Marque" : "Selecione"} {product.variantType?.toLowerCase()}
              {!product.variantSelectionRequired && " (opcional)"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-muted">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="space-y-2">
          {isMultiple ? (
            <>
              {availableVariants.map((variant) => {
                const checked = selectedIds.includes(variant.id);
                return (
                  <label
                    key={variant.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left font-bold transition-colors ${
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, variant.id]
                            : current.filter((variantId) => variantId !== variant.id),
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    {variant.name}
                  </label>
                );
              })}
              {!product.variantSelectionRequired && selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="w-full rounded-xl border p-3 text-sm font-bold text-muted-foreground hover:bg-muted"
                >
                  Limpar seleção
                </button>
              )}
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => onSelect(selectedVariants)}
                className="mt-3 w-full rounded-xl bg-primary p-4 font-black text-primary-foreground disabled:opacity-40"
              >
                Confirmar combinação
              </button>
            </>
          ) : (
            <>
              {!product.variantSelectionRequired && (
                <button
                  type="button"
                  onClick={() => onSelect([])}
                  className="w-full rounded-xl border p-4 text-left font-bold hover:border-primary hover:bg-primary/5"
                >
                  Sem escolha
                </button>
              )}
              {availableVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onSelect([variant])}
                  className="w-full rounded-xl border p-4 text-left font-bold hover:border-primary hover:bg-primary/5"
                >
                  {variant.name}
                </button>
              ))}
            </>
          )}
          {availableVariants.length === 0 && product.variantSelectionRequired && (
            <p className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              Nenhuma opção disponível no momento.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground font-semibold">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function paymentLabel(p: ApiPaymentMethod | null) {
  return p === "PIX"
    ? "PIX"
    : p === "DINHEIRO"
      ? "Dinheiro"
      : p === "CARTAO"
        ? "Cartão"
        : "Não informada";
}

function paymentStatusLabel(order: ApiOrder) {
  if (order.paymentStatus === "PAID") return "Pago";
  if (order.paymentStatus === "CANCELLED") return "Cancelado";
  return "Pendente";
}

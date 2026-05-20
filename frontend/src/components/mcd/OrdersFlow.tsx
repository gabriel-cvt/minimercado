import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, Search, Minus, Plus, ShoppingBag, CheckCircle2, X, CreditCard, Banknote, Clock, Sparkles } from "lucide-react";
import { useStore, formatBRL, formatCPF, isValidCPF } from "@/lib/store";
import type { PaymentMethod, Order } from "@/lib/types";

type Step = "cpf" | "register" | "products" | "success";

export function OrdersFlow() {
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const { products, cart, setQty, currentCustomer, setCurrentCustomer, findCustomer, registerCustomer, placeOrder, clearCart } = useStore();

  const cartItems = Object.entries(cart).map(([pid, qty]) => {
    const p = products.find((x) => x.id === pid)!;
    return { ...p, qty };
  });
  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const totalCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const handleCpf = () => {
    setError("");
    if (!isValidCPF(cpf)) { setError("Informe um CPF válido com 11 dígitos."); return; }
    const found = findCustomer(cpf);
    if (found) { setCurrentCustomer(found); setStep("products"); }
    else setStep("register");
  };

  const handleRegister = () => {
    if (name.trim().length < 3) { setError("O nome deve ter ao menos 3 caracteres."); return; }
    const c = registerCustomer(cpf, name.trim());
    setCurrentCustomer(c);
    setStep("products");
  };

  const handleFinalize = () => {
    if (!payment) return;
    const order = placeOrder(payment);
    setPlacedOrder(order);
    setShowSummary(false);
    setPayment(null);
    setStep("success");
  };

  const reset = () => {
    setStep("cpf"); setCpf(""); setName(""); setError(""); setPlacedOrder(null); clearCart();
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative pb-32">
      <AnimatePresence mode="wait">
        {step === "cpf" && (
          <motion.section key="cpf" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-hero text-primary-foreground rounded-3xl overflow-hidden shadow-elegant">
            <div className="px-6 py-16 md:py-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" /> Autoatendimento
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-3 leading-[1.05]">Identifique-se para começar</h1>
              <p className="text-lg text-white/90 mb-8 font-medium">Informe seu CPF para iniciar seu pedido</p>
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-elegant text-left max-w-md mx-auto">
                <label className="text-sm font-semibold text-foreground mb-2 block">Digite seu CPF</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    value={formatCPF(cpf)} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric" placeholder="000.000.000-00"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-input bg-background text-foreground text-lg font-mono font-semibold focus:border-primary focus:outline-none transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleCpf()}
                  />
                </div>
                {error && <p className="text-destructive text-sm mt-2 font-medium">{error}</p>}
                <button onClick={handleCpf} className="mt-5 w-full bg-gradient-primary text-primary-foreground font-bold text-lg py-4 rounded-xl shadow-elegant hover:shadow-glow transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-xs text-muted-foreground mt-4 text-center">Teste com o CPF <span className="font-mono font-bold">123.456.789-00</span></p>
              </div>
            </div>
          </motion.section>
        )}

        {step === "register" && (
          <motion.section key="reg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-hero text-primary-foreground rounded-3xl overflow-hidden shadow-elegant">
            <div className="max-w-md mx-auto px-6 py-16">
              <h1 className="text-4xl font-black mb-2">Cadastro rápido</h1>
              <p className="text-white/90 mb-8">CPF <span className="font-mono font-bold">{formatCPF(cpf)}</span> não encontrado. Informe seu nome para continuar.</p>
              <div className="bg-white rounded-3xl p-6 shadow-elegant">
                <label className="text-sm font-semibold text-foreground mb-2 block">Nome completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva"
                  className="w-full px-4 py-4 rounded-xl border-2 border-input text-foreground text-lg focus:border-primary focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()} autoFocus />
                {error && <p className="text-destructive text-sm mt-2 font-medium">{error}</p>}
                <button onClick={handleRegister} className="mt-5 w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant hover:scale-[1.02] active:scale-95 transition-all">
                  Cadastrar e Continuar
                </button>
                <button onClick={() => setStep("cpf")} className="mt-3 w-full py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">Voltar</button>
              </div>
            </div>
          </motion.section>
        )}

        {step === "products" && (
          <motion.section key="prod" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-gradient-hero text-primary-foreground rounded-3xl overflow-hidden shadow-elegant mb-6">
              <div className="px-6 py-10">
                <p className="text-white/90 font-medium">Olá, {currentCustomer?.fullName} 👋</p>
                <h1 className="text-4xl md:text-5xl font-black mb-4">Monte seu pedido</h1>
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produtos..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-foreground focus:outline-none focus:ring-4 focus:ring-white/30" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground font-medium">Nenhum produto encontrado.</div>
              )}
              {filtered.map((p) => {
                const qty = cart[p.id] ?? 0;
                return (
                  <motion.div key={p.id} layout whileHover={{ y: -4 }} className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elegant transition-shadow border">
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-full whitespace-nowrap">{p.kitchen}</span>
                      </div>
                      <p className="text-2xl font-black text-primary mb-3">{formatBRL(p.price)}</p>
                      <div className="flex items-center justify-between bg-muted rounded-xl p-1">
                        <button onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0}
                          className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-foreground transition-colors" aria-label="Diminuir">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-xl tabular-nums w-10 text-center">{qty}</span>
                        <button onClick={() => setQty(p.id, qty + 1)}
                          className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow transition-colors" aria-label="Adicionar">
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
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                  className="fixed bottom-0 left-0 right-0 z-40 bg-foreground text-background shadow-elegant">
                  <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-background/70 font-semibold uppercase tracking-wide">{totalCount} {totalCount > 1 ? "itens" : "item"}</p>
                      <p className="text-2xl md:text-3xl font-black">{formatBRL(total)}</p>
                    </div>
                    <button onClick={() => setShowSummary(true)} className="bg-gradient-primary text-primary-foreground font-bold px-6 md:px-8 py-4 rounded-xl shadow-glow hover:scale-105 transition-transform flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" /> Finalizar Pedido
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {step === "success" && placedOrder && (
          <motion.section key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center px-6 py-16">
            <div className="bg-card rounded-3xl shadow-elegant p-10 max-w-md w-full text-center border">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-status-finished/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-status-finished" />
              </motion.div>
              <h1 className="text-3xl font-black mb-2">Pedido realizado com sucesso!</h1>
              <p className="text-muted-foreground mb-6">Enviado para a cozinha. Acompanhe pelo painel.</p>
              <div className="bg-muted rounded-2xl p-5 mb-6 space-y-2 text-left">
                <Row label="Pedido nº" value={`#${placedOrder.number}`} />
                <Row label="Total" value={formatBRL(placedOrder.total)} />
                <Row label="Pagamento" value={paymentLabel(placedOrder.paymentMethod)} />
                <Row label="Tempo estimado" value="~10 min" />
              </div>
              <button onClick={reset} className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant hover:scale-[1.02] transition-transform">
                Novo pedido
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setShowSummary(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-elegant">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-black">Resumo do pedido</h2>
                <button onClick={() => setShowSummary(false)} className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {cartItems.map((i) => (
                  <div key={i.id} className="flex items-center gap-3">
                    <img src={i.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="font-bold">{i.name}</p>
                      <p className="text-sm text-muted-foreground">{i.qty} × {formatBRL(i.price)}</p>
                    </div>
                    <p className="font-black">{formatBRL(i.qty * i.price)}</p>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t bg-muted/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Total</span>
                  <span className="text-3xl font-black text-primary">{formatBRL(total)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Forma de pagamento</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "pix" as const, label: "PIX", Icon: Sparkles },
                      { v: "cash" as const, label: "Dinheiro", Icon: Banknote },
                      { v: "pending" as const, label: "Pendente", Icon: Clock },
                    ]).map(({ v, label, Icon }) => (
                      <button key={v} onClick={() => setPayment(v)}
                        className={`p-3 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all ${payment === v ? "border-primary bg-primary/10 text-primary scale-105" : "border-border bg-card hover:border-primary/40"}`}>
                        <Icon className="w-5 h-5" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleFinalize} disabled={!payment}
                  className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" /> Confirmar e Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function paymentLabel(p: PaymentMethod) {
  return p === "pix" ? "PIX" : p === "cash" ? "Dinheiro" : "Pendente";
}
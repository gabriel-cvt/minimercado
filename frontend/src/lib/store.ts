import { create } from "zustand";
import type { Customer, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, Product } from "./types";

const seedProducts: Product[] = [
  { id: "p1", name: "Big Mac", price: 28.9, kitchen: "Sanduíches", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
  { id: "p2", name: "Quarteirão com Queijo", price: 32.5, kitchen: "Sanduíches", imageUrl: "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600&q=80" },
  { id: "p3", name: "McChicken", price: 24.0, kitchen: "Sanduíches", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80" },
  { id: "p4", name: "Batata Frita (G)", price: 14.9, kitchen: "Geral", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80" },
  { id: "p5", name: "Coca-Cola 500ml", price: 9.5, kitchen: "Bebidas", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80" },
  { id: "p6", name: "Suco de Laranja", price: 11.0, kitchen: "Bebidas", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80" },
  { id: "p7", name: "McFlurry Oreo", price: 16.9, kitchen: "Sobremesas", imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&q=80" },
  { id: "p8", name: "Torta de Maçã", price: 7.5, kitchen: "Sobremesas", imageUrl: "https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=600&q=80" },
];

const seedCustomers: Customer[] = [
  { id: "c1", cpf: "12345678900", fullName: "Maria Silva" },
  { id: "c2", cpf: "98765432100", fullName: "João Pereira" },
  { id: "c3", cpf: "11122233344", fullName: "Ana Souza" },
  { id: "c4", cpf: "55566677788", fullName: "Carlos Lima" },
  { id: "c5", cpf: "22233344455", fullName: "Beatriz Alves" },
];

let orderCounter = 1050;

function makeSeedOrders(): Order[] {
  const now = Date.now();
  const H = 3_600_000;
  const mk = (
    hoursAgo: number, customer: Customer, items: { p: Product; q: number }[],
    payment: PaymentMethod, status: OrderStatus, paymentStatus: PaymentStatus,
  ): Order => {
    const orderItems: OrderItem[] = items.map(({ p, q }) => ({
      productId: p.id, name: p.name, quantity: q, price: p.price, kitchen: p.kitchen,
    }));
    const total = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const createdAt = now - hoursAgo * H;
    return {
      id: crypto.randomUUID(), number: ++orderCounter,
      customerId: customer.id, customerName: customer.fullName,
      items: orderItems, total, paymentMethod: payment, paymentStatus,
      status, createdAt,
      finishedAt: status === "finished" ? createdAt + 8 * 60_000 : undefined,
    };
  };
  return [
    mk(8, seedCustomers[0], [{ p: seedProducts[0], q: 1 }, { p: seedProducts[3], q: 1 }, { p: seedProducts[4], q: 1 }], "pix", "finished", "paid"),
    mk(7.2, seedCustomers[1], [{ p: seedProducts[1], q: 2 }, { p: seedProducts[4], q: 2 }], "cash", "finished", "paid"),
    mk(6, seedCustomers[2], [{ p: seedProducts[2], q: 1 }, { p: seedProducts[6], q: 1 }], "pending", "finished", "pending"),
    mk(5, seedCustomers[3], [{ p: seedProducts[0], q: 2 }, { p: seedProducts[3], q: 2 }, { p: seedProducts[5], q: 2 }], "pix", "finished", "paid"),
    mk(4.5, seedCustomers[0], [{ p: seedProducts[7], q: 3 }], "pix", "finished", "paid"),
    mk(3, seedCustomers[4], [{ p: seedProducts[1], q: 1 }, { p: seedProducts[5], q: 1 }], "pending", "finished", "overdue"),
    mk(2.5, seedCustomers[2], [{ p: seedProducts[2], q: 2 }, { p: seedProducts[3], q: 1 }], "cash", "finished", "paid"),
    mk(1.5, seedCustomers[3], [{ p: seedProducts[0], q: 1 }, { p: seedProducts[6], q: 2 }], "pending", "finished", "pending"),
    mk(0.8, seedCustomers[1], [{ p: seedProducts[1], q: 1 }, { p: seedProducts[4], q: 1 }], "pix", "assembly", "paid"),
    mk(0.3, seedCustomers[0], [{ p: seedProducts[2], q: 1 }, { p: seedProducts[7], q: 1 }], "cash", "preparing", "paid"),
    mk(0.1, seedCustomers[4], [{ p: seedProducts[0], q: 2 }, { p: seedProducts[3], q: 2 }, { p: seedProducts[4], q: 2 }], "pix", "preparing", "paid"),
  ];
}

interface State {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  cart: Record<string, number>;
  currentCustomer: Customer | null;
  addProduct: (p: Omit<Product, "id">) => void;
  findCustomer: (cpf: string) => Customer | null;
  registerCustomer: (cpf: string, fullName: string) => Customer;
  setCurrentCustomer: (c: Customer | null) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: PaymentMethod) => Order;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  markPaid: (id: string) => void;
}

export const useStore = create<State>((set, get) => ({
  products: seedProducts,
  customers: seedCustomers,
  orders: makeSeedOrders(),
  cart: {},
  currentCustomer: null,
  addProduct: (p) => set((s) => ({ products: [...s.products, { ...p, id: crypto.randomUUID() }] })),
  findCustomer: (cpf) => get().customers.find((c) => c.cpf === cpf.replace(/\D/g, "")) ?? null,
  registerCustomer: (cpf, fullName) => {
    const c: Customer = { id: crypto.randomUUID(), cpf: cpf.replace(/\D/g, ""), fullName };
    set((s) => ({ customers: [...s.customers, c] }));
    return c;
  },
  setCurrentCustomer: (c) => set({ currentCustomer: c }),
  setQty: (productId, qty) => set((s) => {
    const cart = { ...s.cart };
    if (qty <= 0) delete cart[productId];
    else cart[productId] = qty;
    return { cart };
  }),
  clearCart: () => set({ cart: {}, currentCustomer: null }),
  placeOrder: (paymentMethod) => {
    const { cart, products, currentCustomer } = get();
    const items: OrderItem[] = Object.entries(cart).map(([pid, qty]) => {
      const p = products.find((x) => x.id === pid)!;
      return { productId: pid, name: p.name, quantity: qty, price: p.price, kitchen: p.kitchen };
    });
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const order: Order = {
      id: crypto.randomUUID(),
      number: ++orderCounter,
      customerId: currentCustomer!.id,
      customerName: currentCustomer!.fullName,
      items, total, paymentMethod,
      paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
      status: "preparing",
      createdAt: Date.now(),
    };
    set((s) => ({ orders: [order, ...s.orders], cart: {}, currentCustomer: null }));
    setTimeout(() => {
      const cur = get().orders.find((o) => o.id === order.id);
      if (cur && cur.status === "preparing") get().setOrderStatus(order.id, "assembly");
    }, 8000);
    return order;
  },
  setOrderStatus: (id, status) => set((s) => ({
    orders: s.orders.map((o) => o.id === id ? { ...o, status, finishedAt: status === "finished" ? Date.now() : o.finishedAt } : o),
  })),
  markPaid: (id) => set((s) => ({
    orders: s.orders.map((o) => o.id === id ? { ...o, paymentStatus: "paid" } : o),
  })),
}));

export const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
export const isValidCPF = (v: string) => v.replace(/\D/g, "").length === 11;
export const formatDateTime = (ts: number) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
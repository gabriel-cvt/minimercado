import { create } from "zustand";
import type { Customer, Order, OrderItem, OrderStatus, PaymentMethod, Product } from "./types";

const seedProducts: Product[] = [
  { id: "p1", name: "Big Mac", price: 28.9, kitchen: "Sandwiches", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
  { id: "p2", name: "Quarter Pounder", price: 32.5, kitchen: "Sandwiches", imageUrl: "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600&q=80" },
  { id: "p3", name: "McChicken", price: 24.0, kitchen: "Sandwiches", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80" },
  { id: "p4", name: "French Fries (L)", price: 14.9, kitchen: "General", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80" },
  { id: "p5", name: "Coca-Cola 500ml", price: 9.5, kitchen: "Drinks", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80" },
  { id: "p6", name: "Orange Juice", price: 11.0, kitchen: "Drinks", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80" },
  { id: "p7", name: "McFlurry Oreo", price: 16.9, kitchen: "Desserts", imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&q=80" },
  { id: "p8", name: "Apple Pie", price: 7.5, kitchen: "Desserts", imageUrl: "https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=600&q=80" },
];

const seedCustomers: Customer[] = [
  { id: "c1", cpf: "12345678900", fullName: "Maria Silva" },
];

let orderCounter = 1050;

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
}

export const useStore = create<State>((set, get) => ({
  products: seedProducts,
  customers: seedCustomers,
  orders: [],
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
      status: "preparing",
      createdAt: Date.now(),
    };
    set((s) => ({ orders: [order, ...s.orders], cart: {}, currentCustomer: null }));
    // Auto-progress to assembly after 8s for demo realtime
    setTimeout(() => {
      const cur = get().orders.find((o) => o.id === order.id);
      if (cur && cur.status === "preparing") get().setOrderStatus(order.id, "assembly");
    }, 8000);
    return order;
  },
  setOrderStatus: (id, status) => set((s) => ({
    orders: s.orders.map((o) => o.id === id ? { ...o, status, finishedAt: status === "finished" ? Date.now() : o.finishedAt } : o),
  })),
}));

export const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
export const isValidCPF = (v: string) => v.replace(/\D/g, "").length === 11;

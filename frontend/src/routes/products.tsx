import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImageIcon, CheckCircle2, X, PackagePlus } from "lucide-react";
import { useStore, formatBRL } from "@/lib/store";
import type { KitchenName } from "@/lib/types";

export const Route = createFileRoute("/products")({ component: ProductsPage });

const kitchens: KitchenName[] = ["Sandwiches", "Drinks", "Desserts", "General"];

const schema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  price: z.number().positive("Price must be > 0").max(10000),
  kitchen: z.enum(["Sandwiches", "Drinks", "Desserts", "General"]),
  imageUrl: z.string().trim().min(4, "Image URL required").max(500),
});
type FormData = z.infer<typeof schema>;

function ProductsPage() {
  const [confirm, setConfirm] = useState<FormData | null>(null);
  const [success, setSuccess] = useState(false);
  const { addProduct, products } = useStore();

  const { register, handleSubmit, watch, formState: { errors, isValid }, reset } = useForm<FormData>({
    resolver: zodResolver(schema), mode: "onChange",
    defaultValues: { name: "", price: 0, kitchen: "Sandwiches", imageUrl: "" },
  });

  const imageUrl = watch("imageUrl");
  const [imgErr, setImgErr] = useState(false);

  const onSubmit = (data: FormData) => setConfirm(data);

  const confirmSave = () => {
    if (!confirm) return;
    addProduct(confirm);
    setConfirm(null);
    setSuccess(true);
    reset();
    setTimeout(() => setSuccess(false), 2200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <PackagePlus className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black">Product Registration</h1>
          <p className="text-muted-foreground">Add new menu items to McDominus</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-3xl shadow-card border p-6 md:p-8 space-y-5">
          <Field label="Product name" error={errors.name?.message}>
            <input {...register("name")} placeholder="e.g. McSpicy Deluxe"
              className="input" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Unit price (BRL)" error={errors.price?.message}>
              <input type="number" step="0.01" {...register("price", { valueAsNumber: true })} placeholder="29.90" className="input font-mono" />
            </Field>
            <Field label="Responsible kitchen" error={errors.kitchen?.message}>
              <select {...register("kitchen")} className="input">
                {kitchens.map((k) => <option key={k} value={k}>{k} Kitchen</option>)}
              </select>
            </Field>
          </div>
          <Field label="Image URL" error={errors.imageUrl?.message}>
            <input {...register("imageUrl")} placeholder="https://..." className="input" onChange={() => setImgErr(false)} />
          </Field>

          <button type="submit" disabled={!isValid}
            className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform">
            Register Product
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-card rounded-3xl shadow-card border p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">Image preview</p>
            <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
              {imageUrl && !imgErr ? (
                <img src={imageUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-cover animate-scale-pop" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <ImageIcon className="w-10 h-10" />
                  <span className="text-sm font-medium">{imgErr ? "Failed to load" : "No image"}</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-card rounded-3xl shadow-card border p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">Catalog ({products.length})</p>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted">
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.kitchen}</p>
                  </div>
                  <span className="text-sm font-black text-primary">{formatBRL(p.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setConfirm(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-3xl shadow-elegant max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Confirm registration</h2>
                <button onClick={() => setConfirm(null)} className="w-9 h-9 rounded-full bg-muted hover:bg-border flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <img src={confirm.imageUrl} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl mb-4" />
              <div className="space-y-1.5 mb-6">
                <p className="text-2xl font-black">{confirm.name}</p>
                <p className="text-primary text-xl font-bold">{formatBRL(confirm.price)}</p>
                <p className="text-sm text-muted-foreground">{confirm.kitchen} Kitchen</p>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Do you want to confirm this product registration?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted">Cancel</button>
                <button onClick={confirmSave} className="flex-1 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-status-finished text-white px-6 py-4 rounded-2xl shadow-elegant flex items-center gap-3 font-bold">
            <CheckCircle2 className="w-5 h-5" /> Product registered successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

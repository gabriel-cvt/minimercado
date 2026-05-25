import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImageIcon, CheckCircle2, X, PackagePlus } from "lucide-react";
import { createProduct, getProducts } from "@/lib/api";
import { formatBRL } from "@/lib/format";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  price: z
    .number({ invalid_type_error: "Informe um preço" })
    .positive("O preço deve ser maior que 0")
    .max(10000, "Preço muito alto"),
  urlImage: z.string().trim().url("Informe uma URL válida").max(500),
  stockQuantity: z
    .number({ invalid_type_error: "Informe o estoque" })
    .int()
    .min(0, "O estoque não pode ser negativo"),
});
type FormData = z.infer<typeof schema>;

export function ProductsForm() {
  const [confirm, setConfirm] = useState<FormData | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["products", "catalog"],
    queryFn: () => getProducts(),
  });
  const products = productsQuery.data?.content ?? [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      price: 0,
      urlImage: "",
      stockQuantity: 0,
    },
  });

  const imageUrl = watch("urlImage");
  const [imgErr, setImgErr] = useState(false);
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setConfirm(null);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 2200);
    },
  });

  const onSubmit = (data: FormData) => setConfirm(data);

  const confirmSave = () => {
    if (!confirm) return;
    createMutation.mutate(confirm);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
          <PackagePlus className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Cadastro de Produtos</h2>
          <p className="text-muted-foreground">Adicione novos itens ao cardápio do McDominus</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-3xl shadow-card border p-6 md:p-8 space-y-5"
        >
          <Field label="Nome do produto" error={errors.name?.message}>
            <input {...register("name")} placeholder="Ex: McSpicy Deluxe" className="input" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Preço unitário (R$)" error={errors.price?.message}>
              <input
                type="number"
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                placeholder="29,90"
                className="input font-mono"
              />
            </Field>
            <Field label="Estoque inicial" error={errors.stockQuantity?.message}>
              <input
                type="number"
                min={0}
                {...register("stockQuantity", { valueAsNumber: true })}
                className="input font-mono"
              />
            </Field>
          </div>
          <Field label="URL da imagem" error={errors.urlImage?.message}>
            <input {...register("urlImage")} placeholder="https://..." className="input" />
          </Field>
          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-elegant disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
          >
            Cadastrar Produto
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-card rounded-3xl shadow-card border p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
              Pré-visualização
            </p>
            <div className="aspect-[4/3] rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
              {imageUrl && !imgErr ? (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt=""
                  onLoad={() => setImgErr(false)}
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-cover animate-scale-pop"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <ImageIcon className="w-10 h-10" />
                  <span className="text-sm font-medium">
                    {imgErr ? "Falha ao carregar" : "Sem imagem"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-card rounded-3xl shadow-card border p-6">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
              Catálogo ({productsQuery.data?.totalElements ?? 0})
            </p>
            {productsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
            )}
            {productsQuery.isError && (
              <p className="text-sm text-destructive">Não foi possível carregar produtos.</p>
            )}
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted">
                  {p.urlImage ? (
                    <img src={p.urlImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Estoque {p.stockQuantity}</p>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl shadow-elegant max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Confirmar cadastro</h2>
                <button
                  onClick={() => setConfirm(null)}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-border flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={confirm.urlImage}
                alt=""
                className="w-full aspect-[4/3] object-cover rounded-2xl mb-4"
              />
              <div className="space-y-1.5 mb-6">
                <p className="text-2xl font-black">{confirm.name}</p>
                <p className="text-primary text-xl font-bold">{formatBRL(confirm.price)}</p>
                <p className="text-sm text-muted-foreground">Estoque {confirm.stockQuantity}</p>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Deseja confirmar o cadastro deste produto?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-3 rounded-xl border-2 font-bold hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSave}
                  disabled={createMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
              {createMutation.isError && (
                <p className="mt-3 text-sm text-destructive">
                  Não foi possível cadastrar o produto.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-status-finished text-white px-6 py-4 rounded-2xl shadow-elegant flex items-center gap-3 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" /> Produto cadastrado com sucesso
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

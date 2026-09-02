import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Package, PackagePlus, Pencil, Search, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  createProduct,
  getAllProducts,
  getProduct,
  getProducts,
  updateProduct,
  updateProductAvailability,
  type ApiProduct,
  type ApiProductVariantSelectionMode,
  type Page,
} from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { fuzzyFilterByName } from "@/lib/fuzzy-search";
import { ProductVisual } from "@/components/mcd/ProductVisual";
import { PRODUCT_ICON_OPTIONS } from "@/components/mcd/product-icon-options";

const productIconSchema = z.enum([
  "GENERAL",
  "SANDWICH",
  "DRINK",
  "DESSERT",
  "SNACK",
  "COMBO",
  "MEAL",
  "BAKERY",
  "FROZEN_DESSERT",
  "HOT_DRINK",
]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(255, "Nome muito longo"),
  price: z
    .number({ invalid_type_error: "Informe um preço" })
    .positive("O preço deve ser maior que 0"),
  icon: productIconSchema,
});

const editSchema = createSchema;

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
type AvailabilityFilter = "all" | "available" | "unavailable";
type VariantDraft = { id?: number; name: string; available: boolean };
type ProductConfiguration = {
  hasVariants: boolean;
  variantType: string;
  variantSelectionRequired: boolean;
  variantSelectionMode: ApiProductVariantSelectionMode;
  variants: VariantDraft[];
};
type CreateProductFormData = CreateFormData & ProductConfiguration;
type EditProductFormData = EditFormData & ProductConfiguration;

const PAGE_SIZE = 12;

export function ProductsManagement() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiProduct | null>(null);
  const hasSearch = search.trim().length > 0;

  const productsQuery = useQuery<Page<ApiProduct>>({
    queryKey: ["products", "management", search, availabilityFilter, hasSearch ? "all" : page],
    queryFn: async () => {
      const available =
        availabilityFilter === "all" ? undefined : availabilityFilter === "available";
      if (!hasSearch) {
        return getProducts({ available, page, size: PAGE_SIZE, sort: "name,asc" });
      }

      const allProducts = await getAllProducts({ available, sort: "name,asc" });
      return {
        content: allProducts,
        totalElements: allProducts.length,
        totalPages: 1,
        size: allProducts.length,
        number: 0,
        first: true,
        last: true,
        empty: allProducts.length === 0,
      };
    },
  });

  const fetchedProducts = useMemo(
    () => productsQuery.data?.content ?? [],
    [productsQuery.data?.content],
  );
  const matchedProducts = useMemo(
    () => (hasSearch ? fuzzyFilterByName(fetchedProducts, search) : fetchedProducts),
    [fetchedProducts, hasSearch, search],
  );
  const products = useMemo(
    () =>
      hasSearch ? matchedProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : matchedProducts,
    [hasSearch, matchedProducts, page],
  );
  const totalElements = hasSearch
    ? matchedProducts.length
    : (productsQuery.data?.totalElements ?? 0);
  const totalPages = hasSearch
    ? Math.ceil(matchedProducts.length / PAGE_SIZE)
    : (productsQuery.data?.totalPages ?? 0);
  const isFirstPage = hasSearch ? page === 0 : productsQuery.data?.first;
  const isLastPage = hasSearch ? page >= Math.max(0, totalPages - 1) : productsQuery.data?.last;
  const stats = useMemo(
    () => ({
      total: totalElements,
      available: products.filter((product) => product.available).length,
      unavailable: products.filter((product) => !product.available).length,
    }),
    [products, totalElements],
  );

  async function refreshProducts() {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await refreshProducts();
      setShowCreate(false);
      toast.success("Produto cadastrado com sucesso");
    },
    onError: () =>
      toast.error("Não foi possível cadastrar o produto", {
        duration: Infinity,
      }),
  });
  const detailMutation = useMutation({
    mutationFn: getProduct,
    onSuccess: (product) => setEditTarget(product),
    onError: () =>
      toast.error("Não foi possível carregar o produto", {
        duration: Infinity,
      }),
  });
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditProductFormData }) =>
      updateProduct(id, {
        name: data.name,
        price: data.price,
        icon: data.icon,
        hasVariants: data.hasVariants,
        variantType: data.variantType || undefined,
        variantSelectionRequired: data.variantSelectionRequired,
        variantSelectionMode: data.variantSelectionMode,
        variants: data.variants,
      }),
    onSuccess: async () => {
      await refreshProducts();
      setEditTarget(null);
      toast.success("Produto atualizado com sucesso");
    },
    onError: () =>
      toast.error("Não foi possível atualizar o produto", {
        duration: Infinity,
      }),
  });
  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) =>
      updateProductAvailability(id, available),
    onSuccess: async (product) => {
      await refreshProducts();
      toast.success(product.available ? "Produto habilitado para venda" : "Produto desabilitado");
    },
    onError: () =>
      toast.error("Não foi possível alterar a disponibilidade", {
        duration: Infinity,
      }),
  });

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setPage(0);
    setSearchInput("");
    setSearch("");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary font-bold uppercase tracking-wider text-xs mb-1">
            Catálogo e disponibilidade
          </p>
          <h1 className="text-3xl md:text-4xl font-black">Gestão de Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre itens, atualize informações e controle a disponibilidade do cardápio.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-primary text-primary-foreground px-5 py-3.5 rounded-xl shadow-elegant font-bold hover:scale-[1.02] transition-transform"
        >
          <PackagePlus className="w-5 h-5" /> Novo produto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Metric icon={Package} label="Resultados" value={stats.total} />
        <Metric icon={TrendingUp} label="Habilitados na página" value={stats.available} />
        <Metric icon={AlertTriangle} label="Desabilitados na página" value={stats.unavailable} />
      </div>

      <div className="bg-card rounded-2xl border shadow-card p-4 md:p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <form onSubmit={submitSearch} className="flex gap-2 w-full lg:max-w-lg">
          <label className="relative flex-1">
            <span className="sr-only">Buscar produto</span>
            <Search className="absolute w-4 h-4 text-muted-foreground left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar produto pelo nome"
              className="input pl-10"
            />
          </label>
          <button className="bg-primary text-primary-foreground px-4 rounded-xl font-bold">
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-3 rounded-xl border font-semibold text-muted-foreground hover:bg-muted"
            >
              Limpar
            </button>
          )}
        </form>
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "all" as const, label: "Todos" },
            { id: "available" as const, label: "Habilitados" },
            { id: "unavailable" as const, label: "Desabilitados" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setPage(0);
                setAvailabilityFilter(filter.id);
              }}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                availabilityFilter === filter.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {productsQuery.isLoading && (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground font-medium">
          Carregando produtos...
        </div>
      )}
      {productsQuery.isError && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-destructive font-medium">
          Não foi possível carregar os produtos.
        </div>
      )}
      {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && (
        <div className="bg-card border rounded-3xl px-6 py-16 text-center">
          <Package className="w-11 h-11 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-black text-xl">Nenhum produto encontrado</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre um novo produto ou ajuste os filtros de busca.
          </p>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              editing={detailMutation.isPending && detailMutation.variables === product.id}
              onEdit={() => detailMutation.mutate(product.id)}
              toggling={
                availabilityMutation.isPending && availabilityMutation.variables?.id === product.id
              }
              onToggle={() =>
                availabilityMutation.mutate({ id: product.id, available: !product.available })
              }
            />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="bg-card border rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground font-semibold">
            Página {page + 1} de {totalPages} · {totalElements} produtos encontrados
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isFirstPage}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="border rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={isLastPage}
              onClick={() => setPage((current) => current + 1)}
              className="border rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateProductModal
            pending={createMutation.isPending}
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createMutation.mutate(data)}
          />
        )}
        {editTarget && (
          <EditProductModal
            product={editTarget}
            pending={editMutation.isPending}
            onClose={() => setEditTarget(null)}
            onSubmit={(data) => editMutation.mutate({ id: editTarget.id, data })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card rounded-2xl border shadow-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-bold uppercase truncate">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  editing,
  toggling,
  onEdit,
  onToggle,
}: {
  product: ApiProduct;
  editing: boolean;
  toggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <article className="bg-card border rounded-3xl overflow-hidden shadow-card flex flex-col">
      <ProductVisual icon={product.icon} className="aspect-[16/10]" />
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              Produto #{product.id}
            </p>
            <h2 className="font-black text-lg leading-tight truncate">{product.name}</h2>
          </div>
          <span className="font-black text-primary whitespace-nowrap">
            {formatBRL(product.price)}
          </span>
        </div>
        <div
          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
            product.available
              ? "bg-status-finished/15 text-status-finished"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {product.available ? "Habilitado para venda" : "Desabilitado para venda"}
        </div>
        <div className="flex flex-wrap gap-2">
          {product.hasVariants && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {product.variantType} · {product.variants.length} opções ·{" "}
              {product.variantSelectionMode === "MULTIPLE" ? "Combinação" : "Exclusiva"}
            </span>
          )}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={editing}
            aria-label={`Editar ${product.name}`}
            className="rounded-xl border px-3 py-2 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-muted disabled:opacity-50"
          >
            <Pencil className="w-4 h-4" /> {editing ? "Abrindo..." : "Editar"}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={toggling}
            aria-label={`${product.available ? "Desabilitar" : "Habilitar"} ${product.name}`}
            className={`rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 ${
              product.available
                ? "border border-destructive/25 text-destructive hover:bg-destructive/10"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {toggling ? "Salvando..." : product.available ? "Desabilitar" : "Habilitar"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CreateProductModal({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", price: 0, icon: "GENERAL" },
  });
  const [configuration, setConfiguration] = useState<ProductConfiguration>(
    emptyProductConfiguration(),
  );
  const [configurationError, setConfigurationError] = useState<string>();

  function submit(data: CreateFormData) {
    const configured = validateConfiguration(configuration);
    if (typeof configured === "string") {
      setConfigurationError(configured);
      return;
    }
    onSubmit({ ...data, ...configured });
  }

  return (
    <Modal
      title="Novo produto"
      subtitle="Preencha as informações para incluir o produto no cardápio."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)} className="grid md:grid-cols-[1fr_180px] gap-5">
        <ProductFields
          nameField={register("name")}
          nameError={errors.name?.message}
          priceField={register("price", { valueAsNumber: true })}
          priceError={errors.price?.message}
          iconField={register("icon")}
          iconError={errors.icon?.message}
        />
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
            Pré-visualização
          </p>
          <ProductVisual icon={watch("icon")} className="aspect-[16/10] rounded-2xl" />
        </div>
        <ProductConfigurationFields
          configuration={configuration}
          onChange={(next) => {
            setConfiguration(next);
            setConfigurationError(undefined);
          }}
          error={configurationError}
        />
        <ModalActions pending={pending} action="Cadastrar produto" onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditProductModal({
  product,
  pending,
  onClose,
  onSubmit,
}: {
  product: ApiProduct;
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: EditProductFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: product.name,
      price: product.price,
      icon: product.icon,
    },
  });
  const [configuration, setConfiguration] = useState<ProductConfiguration>({
    hasVariants: product.hasVariants,
    variantType: product.variantType ?? "",
    variantSelectionRequired: product.variantSelectionRequired,
    variantSelectionMode: product.variantSelectionMode ?? "SINGLE",
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      available: variant.available,
    })),
  });
  const [configurationError, setConfigurationError] = useState<string>();

  function submit(data: EditFormData) {
    const configured = validateConfiguration(configuration);
    if (typeof configured === "string") {
      setConfigurationError(configured);
      return;
    }
    onSubmit({ ...data, ...configured });
  }

  return (
    <Modal
      title={`Editar produto #${product.id}`}
      subtitle={`Disponibilidade: ${product.available ? "habilitado" : "desabilitado"}.`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)} className="grid md:grid-cols-[1fr_180px] gap-5">
        <ProductFields
          nameField={register("name")}
          nameError={errors.name?.message}
          priceField={register("price", { valueAsNumber: true })}
          priceError={errors.price?.message}
          iconField={register("icon")}
          iconError={errors.icon?.message}
        />
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
            Pré-visualização
          </p>
          <ProductVisual icon={watch("icon")} className="aspect-[16/10] rounded-2xl" />
        </div>
        <ProductConfigurationFields
          configuration={configuration}
          onChange={(next) => {
            setConfiguration(next);
            setConfigurationError(undefined);
          }}
          error={configurationError}
          preserveExistingVariants
        />
        <ModalActions pending={pending} action="Salvar alterações" onClose={onClose} />
      </form>
    </Modal>
  );
}

function ProductFields({
  nameField,
  nameError,
  priceField,
  priceError,
  iconField,
  iconError,
}: {
  nameField: UseFormRegisterReturn;
  nameError?: string;
  priceField: UseFormRegisterReturn;
  priceError?: string;
  iconField: UseFormRegisterReturn;
  iconError?: string;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nome do produto" error={nameError}>
        <input
          {...nameField}
          maxLength={255}
          placeholder="Ex: Sanduíche especial"
          className="input"
        />
      </Field>
      <div className="grid gap-4">
        <Field label="Preço (R$)" error={priceError}>
          <input type="number" step="0.01" {...priceField} className="input font-mono" />
        </Field>
      </div>
      <Field label="Ícone do produto" error={iconError}>
        <select {...iconField} className="input">
          {PRODUCT_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function ProductConfigurationFields({
  configuration,
  onChange,
  error,
  preserveExistingVariants = false,
}: {
  configuration: ProductConfiguration;
  onChange: (configuration: ProductConfiguration) => void;
  error?: string;
  preserveExistingVariants?: boolean;
}) {
  const updateVariant = (index: number, variant: VariantDraft) =>
    onChange({
      ...configuration,
      variants: configuration.variants.map((item, itemIndex) =>
        itemIndex === index ? variant : item,
      ),
    });

  return (
    <section className="md:col-span-2 rounded-2xl border bg-muted/25 p-4 space-y-4">
      <div>
        <p className="font-black">Configuração de variantes</p>
        <p className="text-sm text-muted-foreground">
          Combos são cadastrados como produtos comuns. Use variantes somente quando o item possuir
          escolhas, como sabor ou recheio.
        </p>
      </div>
      <label className="flex items-center gap-3 rounded-xl bg-card border p-3">
        <input
          type="checkbox"
          disabled={
            preserveExistingVariants && configuration.variants.some((variant) => variant.id)
          }
          checked={configuration.hasVariants}
          onChange={(event) =>
            onChange({
              ...configuration,
              hasVariants: event.target.checked,
              variantSelectionRequired: event.target.checked
                ? configuration.variantSelectionRequired
                : false,
              variantSelectionMode: event.target.checked
                ? configuration.variantSelectionMode
                : "SINGLE",
              variants:
                event.target.checked && configuration.variants.length === 0
                  ? [{ name: "", available: true }]
                  : configuration.variants,
            })
          }
          className="size-4 accent-primary"
        />
        <span className="text-sm font-bold">Produto possui variantes ou sabores</span>
      </label>
      {configuration.hasVariants && (
        <div className="space-y-3 rounded-xl bg-card border p-4">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Tipo de variação">
              <input
                value={configuration.variantType}
                onChange={(event) =>
                  onChange({ ...configuration, variantType: event.target.value })
                }
                placeholder="Ex: Recheio ou Sabor"
                className="input"
              />
            </Field>
            <label className="h-12 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={configuration.variantSelectionRequired}
                onChange={(event) =>
                  onChange({
                    ...configuration,
                    variantSelectionRequired: event.target.checked,
                  })
                }
                className="size-4 accent-primary"
              />
              Escolha obrigatória
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                value: "SINGLE" as const,
                title: "Exclusiva",
                detail: "Cliente escolhe apenas uma opção.",
              },
              {
                value: "MULTIPLE" as const,
                title: "Combinação",
                detail: "Cliente pode marcar várias opções.",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...configuration, variantSelectionMode: option.value })}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  configuration.variantSelectionMode === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 hover:border-primary/40"
                }`}
              >
                <span className="block text-sm font-black">{option.title}</span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  {option.detail}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Todas as variantes usam o preço do produto. Desmarque disponível para ocultar apenas uma
            opção na montagem do pedido.
          </p>
          {configuration.variants.map((variant, index) => (
            <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <input
                value={variant.name}
                onChange={(event) => updateVariant(index, { ...variant, name: event.target.value })}
                placeholder="Nome da variante"
                className="input flex-1"
              />
              <label className="h-12 px-3 rounded-xl bg-muted flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={variant.available}
                  onChange={(event) =>
                    updateVariant(index, { ...variant, available: event.target.checked })
                  }
                  className="size-4 accent-primary"
                />
                Disponível
              </label>
              <button
                type="button"
                disabled={Boolean(variant.id)}
                onClick={() =>
                  onChange({
                    ...configuration,
                    variants: configuration.variants.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                className="h-12 px-3 rounded-xl border text-destructive font-bold disabled:text-muted-foreground disabled:opacity-60"
              >
                {variant.id ? "Preservada" : "Remover"}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...configuration,
                variants: [...configuration.variants, { name: "", available: true }],
              })
            }
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            Adicionar variante
          </button>
        </div>
      )}
      {error && <p className="text-sm text-destructive font-semibold">{error}</p>}
    </section>
  );
}

function emptyProductConfiguration(): ProductConfiguration {
  return {
    hasVariants: false,
    variantType: "",
    variantSelectionRequired: false,
    variantSelectionMode: "SINGLE",
    variants: [],
  };
}

function validateConfiguration(configuration: ProductConfiguration): ProductConfiguration | string {
  const variants = configuration.variants.filter((variant) => variant.name.trim() !== "");
  if (configuration.hasVariants) {
    if (configuration.variantType.trim() === "") return "Informe o tipo da variação.";
    if (variants.length === 0) return "Adicione ao menos uma variante.";
    if (
      new Set(variants.map((variant) => variant.name.trim().toLowerCase())).size !== variants.length
    ) {
      return "Não repita nomes de variantes.";
    }
  }

  return {
    ...configuration,
    variantType: configuration.hasVariants ? configuration.variantType.trim() : "",
    variantSelectionRequired: configuration.hasVariants && configuration.variantSelectionRequired,
    variantSelectionMode: configuration.hasVariants ? configuration.variantSelectionMode : "SINGLE",
    variants: configuration.hasVariants
      ? variants.map((variant) => ({ ...variant, name: variant.name.trim() }))
      : [],
  };
}

function Modal({
  title,
  subtitle,
  onClose,
  narrow = false,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-foreground/60 p-4 backdrop-blur-sm md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 15 }}
        onClick={(event) => event.stopPropagation()}
        className={`mx-auto my-auto w-full shrink-0 rounded-3xl bg-card p-6 shadow-elegant md:p-7 ${narrow ? "max-w-md" : "max-w-4xl"}`}
      >
        <div className="flex justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-black">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalActions({
  pending,
  action,
  onClose,
}: {
  pending: boolean;
  action: string;
  onClose: () => void;
}) {
  return (
    <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-3 rounded-xl border font-bold hover:bg-muted"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={pending}
        className="px-5 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-elegant disabled:opacity-50"
      >
        {pending ? "Salvando..." : action}
      </button>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      {children}
      {error && <span className="text-destructive text-xs mt-1.5 font-medium block">{error}</span>}
    </label>
  );
}

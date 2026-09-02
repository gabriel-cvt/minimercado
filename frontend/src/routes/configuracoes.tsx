import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Palette, RotateCcw, Save, Settings2, Store } from "lucide-react";
import { toast } from "sonner";
import {
  resetAppSettings,
  updateAppSettings,
  type ApiAppSettings,
  type AppSettingsWriteData,
} from "@/lib/api";
import { applyTheme, SETTINGS_QUERY_KEY, useBranding } from "@/branding/branding";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Sistema de Pedidos" }] }),
  component: SettingsPage,
});

const presets = [
  { name: "Clássico", primary: "#B42318", secondary: "#F4B400", accent: "#F7C948" },
  { name: "Oceano", primary: "#075985", secondary: "#38BDF8", accent: "#22D3EE" },
  { name: "Floresta", primary: "#166534", secondary: "#84CC16", accent: "#FACC15" },
  { name: "Uva", primary: "#6B21A8", secondary: "#C084FC", accent: "#F0ABFC" },
] as const;

function SettingsPage() {
  const savedSettings = useBranding();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ApiAppSettings>(savedSettings);
  const previousSavedSettings = useRef(savedSettings);

  useEffect(() => {
    setForm((current) => {
      const hadUnsavedText =
        JSON.stringify(toWriteData(current)) !==
        JSON.stringify(toWriteData(previousSavedSettings.current));
      return hadUnsavedText
        ? {
            ...current,
            updatedAt: savedSettings.updatedAt,
          }
        : savedSettings;
    });
    previousSavedSettings.current = savedSettings;
  }, [savedSettings]);
  useEffect(() => applyTheme(form), [form]);

  const dirty = useMemo(
    () => JSON.stringify(toWriteData(form)) !== JSON.stringify(toWriteData(savedSettings)),
    [form, savedSettings],
  );

  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm("Descartar as alterações de personalização?"),
    enableBeforeUnload: () => dirty,
  });

  const acceptSettings = (settings: ApiAppSettings, message: string) => {
    queryClient.setQueryData(SETTINGS_QUERY_KEY, settings);
    setForm(settings);
    toast.success(message);
  };

  const saveMutation = useMutation({
    mutationFn: () => updateAppSettings(toWriteData(form)),
    onSuccess: (settings) => acceptSettings(settings, "Personalização salva."),
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar."),
  });
  const resetMutation = useMutation({
    mutationFn: resetAppSettings,
    onSuccess: (settings) => acceptSettings(settings, "Tema padrão restaurado."),
    onError: (error: Error) => toast.error(error.message || "Não foi possível restaurar."),
  });
  const update = <K extends keyof ApiAppSettings>(key: K, value: ApiAppSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
            Administração
          </p>
          <h1 className="text-3xl font-black md:text-4xl">Personalização</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Ajuste a identidade do estabelecimento. Textos, cores e aparência ficam permanentes ao
            salvar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(savedSettings);
              applyTheme(savedSettings);
            }}
            disabled={!dirty || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-bold disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Descartar
          </button>
          <button
            type="submit"
            form="settings-form"
            disabled={!dirty || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <form id="settings-form" onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section icon={Store} title="Identidade" description="Nome e textos exibidos ao público.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nome do estabelecimento"
                value={form.businessName}
                maxLength={80}
                onChange={(value) => update("businessName", value)}
              />
              <TextField
                label="Nome curto ou iniciais"
                value={form.shortName}
                maxLength={12}
                onChange={(value) => update("shortName", value)}
              />
              <TextField
                label="Slogan do cabeçalho"
                value={form.tagline}
                maxLength={120}
                onChange={(value) => update("tagline", value)}
              />
              <TextField
                label="Título da página inicial"
                value={form.homeTitle}
                maxLength={120}
                onChange={(value) => update("homeTitle", value)}
              />
              <TextField
                area
                className="md:col-span-2"
                label="Descrição do sistema"
                value={form.description}
                maxLength={240}
                onChange={(value) => update("description", value)}
              />
              <TextField
                area
                className="md:col-span-2"
                label="Texto de apresentação"
                value={form.homeDescription}
                maxLength={300}
                onChange={(value) => update("homeDescription", value)}
              />
              <TextField
                label="Título do painel público"
                value={form.panelTitle}
                maxLength={120}
                onChange={(value) => update("panelTitle", value)}
              />
              <TextField
                label="Subtítulo do painel público"
                value={form.panelSubtitle}
                maxLength={180}
                onChange={(value) => update("panelSubtitle", value)}
              />
              <TextField
                className="md:col-span-2"
                label="Texto do rodapé"
                value={form.footerText}
                maxLength={160}
                onChange={(value) => update("footerText", value)}
              />
            </div>
          </Section>

          <Section
            icon={Palette}
            title="Cores"
            description="A interface calcula contraste, gradientes e sombras automaticamente."
          >
            <div className="mb-5 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      primaryColor: preset.primary,
                      secondaryColor: preset.secondary,
                      accentColor: preset.accent,
                    }))
                  }
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-bold"
                >
                  <span className="flex -space-x-1">
                    {[preset.primary, preset.secondary, preset.accent].map((color) => (
                      <span
                        key={color}
                        className="h-5 w-5 rounded-full border-2 border-card"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField
                label="Primária"
                value={form.primaryColor}
                onChange={(value) => update("primaryColor", value)}
              />
              <ColorField
                label="Secundária"
                value={form.secondaryColor}
                onChange={(value) => update("secondaryColor", value)}
              />
              <ColorField
                label="Destaque"
                value={form.accentColor}
                onChange={(value) => update("accentColor", value)}
              />
              <ColorField
                label="Fundo"
                value={form.backgroundColor}
                onChange={(value) => update("backgroundColor", value)}
              />
              <ColorField
                label="Cards"
                value={form.surfaceColor}
                onChange={(value) => update("surfaceColor", value)}
              />
              <ColorField
                label="Texto"
                value={form.textColor}
                onChange={(value) => update("textColor", value)}
              />
              <ColorField
                label="Texto secundário"
                value={form.mutedTextColor}
                onChange={(value) => update("mutedTextColor", value)}
              />
              <ColorField
                label="Bordas"
                value={form.borderColor}
                onChange={(value) => update("borderColor", value)}
              />
              <ColorField
                label="Em preparo"
                value={form.preparingColor}
                onChange={(value) => update("preparingColor", value)}
              />
              <ColorField
                label="Pronto"
                value={form.readyColor}
                onChange={(value) => update("readyColor", value)}
              />
              <ColorField
                label="Erro/cancelado"
                value={form.destructiveColor}
                onChange={(value) => update("destructiveColor", value)}
              />
            </div>
          </Section>

          <Section
            icon={Settings2}
            title="Aparência"
            description="Opções controladas para manter a interface consistente."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold">
                <span>Fonte</span>
                <select
                  className="input"
                  value={form.fontFamily}
                  onChange={(event) =>
                    update("fontFamily", event.target.value as ApiAppSettings["fontFamily"])
                  }
                >
                  <option value="system">Padrão do sistema</option>
                  <option value="rounded">Arredondada</option>
                  <option value="serif">Serifada</option>
                  <option value="mono">Monoespaçada</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-bold">
                <span>Arredondamento: {form.borderRadius}px</span>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={form.borderRadius}
                  onChange={(event) => update("borderRadius", Number(event.target.value))}
                  className="h-12 w-full accent-primary"
                />
              </label>
            </div>
          </Section>

          <Section
            icon={RotateCcw}
            title="Restauração"
            description="Retorne os textos, as cores e a aparência aos valores iniciais."
          >
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Restaurar textos, cores e aparência para o padrão?"))
                  resetMutation.mutate();
              }}
              disabled={resetMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-bold text-destructive"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar tema padrão
            </button>
          </Section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-card">
            <div className="bg-gradient-hero p-6 text-primary-foreground">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-secondary px-3 font-black text-secondary-foreground">
                  {form.shortName}
                </div>
              </div>
              <p className="text-sm font-bold opacity-80">{form.tagline}</p>
              <h2 className="mt-2 text-3xl font-black">{form.homeTitle}</h2>
              <p className="mt-3 text-sm opacity-90">{form.homeDescription}</p>
              <button
                type="button"
                className="mt-6 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-primary"
              >
                Fazer pedido
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Prévia dos componentes
              </p>
              <div className="rounded-2xl border bg-background p-4">
                <p className="font-black">{form.businessName}</p>
                <p className="text-sm text-muted-foreground">Card com texto secundário e borda.</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-status-preparing/15 px-3 py-1 text-xs font-bold text-status-preparing">
                  Em preparo
                </span>
                <span className="rounded-full bg-status-finished/15 px-3 py-1 text-xs font-bold text-status-finished">
                  Pronto
                </span>
              </div>
              {dirty && (
                <p className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Check className="h-4 w-4" /> Prévia com alterações não salvas
                </p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Store;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-card md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  area = false,
  className = "",
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  area?: boolean;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  const common = {
    value,
    maxLength,
    required: type !== "password",
    placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    className: "input",
  };
  return (
    <label className={`space-y-2 text-sm font-bold ${className}`}>
      <span>{label}</span>
      {area ? <textarea {...common} rows={3} /> : <input {...common} type={type} />}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-bold">
      <span>{label}</span>
      <span className="flex items-center gap-2 rounded-xl border bg-background p-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          value={value}
          pattern="^#[0-9A-Fa-f]{6}$"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
        />
      </span>
    </label>
  );
}

function toWriteData(settings: ApiAppSettings): AppSettingsWriteData {
  const { updatedAt: _updatedAt, ...data } = settings;
  return data;
}

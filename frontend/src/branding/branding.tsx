import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { getPublicSettings, type ApiAppSettings } from "@/lib/api";

export const SETTINGS_QUERY_KEY = ["app-settings"] as const;

export const DEFAULT_SETTINGS: ApiAppSettings = {
  businessName: "Meu Estabelecimento",
  shortName: "ME",
  tagline: "Sistema de Pedidos",
  description: "Sistema para registrar pedidos, acompanhar a cozinha e organizar retiradas.",
  homeTitle: "Pedidos simples, operação organizada.",
  homeDescription: "Registre pedidos, acompanhe a cozinha e organize a retirada em um só lugar.",
  footerText: "Todos os direitos reservados.",
  panelTitle: "Painel de Pedidos",
  panelSubtitle: "Veja quando seu pedido estiver pronto",
  primaryColor: "#B42318",
  secondaryColor: "#F4B400",
  accentColor: "#F7C948",
  backgroundColor: "#FFFCF7",
  surfaceColor: "#FFFFFF",
  textColor: "#251C19",
  mutedTextColor: "#73645F",
  borderColor: "#E9E0DA",
  preparingColor: "#E7A900",
  readyColor: "#27935C",
  destructiveColor: "#C7352A",
  borderRadius: 14,
  fontFamily: "system",
  updatedAt: "",
};

const BrandingContext = createContext<ApiAppSettings>(DEFAULT_SETTINGS);

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/orders": "Pedidos",
  "/produtos": "Produtos",
  "/cozinha": "Cozinha",
  "/dashboard": "Resultados",
  "/painel": "Painel de Pedidos",
  "/configuracoes": "Configurações",
};

export function BrandingProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: ApiAppSettings;
}) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getPublicSettings,
    initialData: initialSettings,
    initialDataUpdatedAt: initialSettings?.updatedAt
      ? new Date(initialSettings.updatedAt).getTime()
      : 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    retry: 1,
  });
  const settings = query.data ?? initialSettings ?? DEFAULT_SETTINGS;

  useEffect(() => {
    applyTheme(settings);
    const page = routeLabels[path] ?? "Sistema de Pedidos";
    document.title = path === "/" ? settings.businessName : `${page} — ${settings.businessName}`;
    updateMeta("description", settings.description);
    updateMeta("author", settings.businessName);
    updateMeta("og:title", `${page} — ${settings.businessName}`, "property");
    updateMeta("og:description", settings.description, "property");
    updateFavicon("/favicon.svg?v=3");
  }, [path, settings]);

  return <BrandingContext.Provider value={settings}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

export function applyTheme(settings: ApiAppSettings) {
  if (typeof document === "undefined") return;
  const colors = [
    settings.primaryColor,
    settings.secondaryColor,
    settings.accentColor,
    settings.backgroundColor,
    settings.surfaceColor,
    settings.textColor,
    settings.mutedTextColor,
    settings.borderColor,
    settings.preparingColor,
    settings.readyColor,
    settings.destructiveColor,
  ];
  if (colors.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color))) return;
  const root = document.documentElement;
  const tokens = themeTokens(settings);
  Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
}

export function themeTokens(settings: ApiAppSettings): Record<string, string> {
  const primaryForeground = readableText(settings.primaryColor);
  const secondaryForeground = readableText(settings.secondaryColor);
  const surfaceForeground = readableText(settings.surfaceColor);
  return {
    "--background": settings.backgroundColor,
    "--foreground": settings.textColor,
    "--card": settings.surfaceColor,
    "--card-foreground": surfaceForeground,
    "--popover": settings.surfaceColor,
    "--popover-foreground": surfaceForeground,
    "--primary": settings.primaryColor,
    "--primary-foreground": primaryForeground,
    "--primary-glow": mix(settings.primaryColor, "#FFFFFF", 18),
    "--secondary": settings.secondaryColor,
    "--secondary-foreground": secondaryForeground,
    "--accent-yellow": settings.accentColor,
    "--muted": mix(settings.backgroundColor, settings.textColor, 7),
    "--muted-foreground": settings.mutedTextColor,
    "--accent": mix(settings.accentColor, settings.backgroundColor, 80),
    "--accent-foreground": settings.textColor,
    "--destructive": settings.destructiveColor,
    "--destructive-foreground": readableText(settings.destructiveColor),
    "--border": settings.borderColor,
    "--input": settings.borderColor,
    "--ring": settings.primaryColor,
    "--status-preparing": settings.preparingColor,
    "--status-assembly": mix(settings.preparingColor, settings.destructiveColor, 45),
    "--status-finished": settings.readyColor,
    "--chart-1": settings.primaryColor,
    "--chart-2": settings.readyColor,
    "--chart-3": mix(settings.primaryColor, "#2563EB", 55),
    "--chart-4": settings.secondaryColor,
    "--chart-5": settings.accentColor,
    "--radius": `${settings.borderRadius / 16}rem`,
    "--app-font": fontStack(settings.fontFamily),
    "--gradient-primary": `linear-gradient(135deg, ${settings.primaryColor}, ${mix(settings.primaryColor, settings.secondaryColor, 35)})`,
    "--gradient-hero": `linear-gradient(135deg, ${settings.primaryColor} 0%, ${mix(settings.primaryColor, settings.secondaryColor, 30)} 55%, ${settings.secondaryColor} 100%)`,
    "--gradient-yellow": `linear-gradient(135deg, ${settings.accentColor}, ${settings.secondaryColor})`,
    "--shadow-elegant": `0 10px 30px -10px ${withAlpha(settings.primaryColor, "55")}`,
    "--shadow-glow": `0 0 40px ${withAlpha(settings.primaryColor, "66")}`,
  };
}

function readableText(hex: string) {
  const [r, g, b] = channels(hex).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#1F1714" : "#FFFFFF";
}

function channels(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function mix(first: string, second: string, secondWeight: number) {
  const a = channels(first);
  const b = channels(second);
  const weight = secondWeight / 100;
  return `#${a
    .map((value, index) => Math.round(value * (1 - weight) + b[index] * weight))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

function fontStack(font: ApiAppSettings["fontFamily"]) {
  if (font === "serif") return 'Georgia, Cambria, "Times New Roman", serif';
  if (font === "rounded") return 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
  if (font === "mono") return "ui-monospace, SFMono-Regular, Menlo, monospace";
  return 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
}

function updateMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function updateFavicon(href: string) {
  const elements = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
  if (elements.length === 0) {
    const element = document.createElement("link");
    element.rel = "icon";
    element.href = href;
    document.head.appendChild(element);
    return;
  }
  elements.forEach((element) => {
    element.href = href;
  });
}

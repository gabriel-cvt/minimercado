import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Header } from "@/components/mcd/Header";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "@/websocket/websocket-provider";
import { BrandingProvider } from "@/branding/branding";
import { DEFAULT_SETTINGS, themeTokens } from "@/branding/branding";
import { getPublicSettings } from "@/lib/api";
import { AccessGate } from "@/components/mcd/AccessGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: () => getPublicSettings().catch(() => DEFAULT_SETTINGS),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.businessName ?? DEFAULT_SETTINGS.businessName },
      {
        name: "description",
        content: loaderData?.description ?? DEFAULT_SETTINGS.description,
      },
      { name: "author", content: loaderData?.businessName ?? DEFAULT_SETTINGS.businessName },
      { property: "og:title", content: loaderData?.businessName ?? DEFAULT_SETTINGS.businessName },
      {
        property: "og:description",
        content: loaderData?.description ?? DEFAULT_SETTINGS.description,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg?v=3",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const settings = Route.useLoaderData();
  return (
    <html lang="pt-BR" style={themeTokens(settings) as React.CSSProperties}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isDisplay = path.startsWith("/painel");
  const initialSettings = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider initialSettings={initialSettings}>
        <AccessGate pathname={path}>
          <WebSocketProvider pathname={path}>
            <div className="min-h-screen flex flex-col">
              {!isDisplay && <Header />}
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={3_000}
              visibleToasts={3}
            />
          </WebSocketProvider>
        </AccessGate>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

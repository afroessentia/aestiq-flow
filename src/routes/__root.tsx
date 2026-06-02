import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Página não encontrada</h2>
        <p className="mt-1 text-sm text-muted-foreground">O endereço acessado não existe.</p>
        <Link to="/" className="mt-5 inline-flex h-12 px-5 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-5 h-12 px-5 rounded-lg bg-primary text-primary-foreground font-semibold">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#2A9D8F" },
      { title: "AESTIQ — Gestão para Clínicas de Estética" },
      { name: "description", content: "Sistema mobile-first para gestão de clínicas de estética avançada." },
      { property: "og:title", content: "AESTIQ — Gestão para Clínicas de Estética" },
      { name: "twitter:title", content: "AESTIQ — Gestão para Clínicas de Estética" },
      { property: "og:description", content: "Sistema mobile-first para gestão de clínicas de estética avançada." },
      { name: "twitter:description", content: "Sistema mobile-first para gestão de clínicas de estética avançada." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d602aed8-d0f2-4cc7-93bd-5a599ce994ab/id-preview-b9a1e2d6--f095a746-e6af-4601-96d4-b589357e05e2.lovable.app-1780421266613.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d602aed8-d0f2-4cc7-93bd-5a599ce994ab/id-preview-b9a1e2d6--f095a746-e6af-4601-96d4-b589357e05e2.lovable.app-1780421266613.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

import { Toaster } from "@bumpatlas/ui/components/sonner";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { MeProvider } from "@/context/me-context";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "BumpAtlas",
      },
      {
        name: "description",
        content:
          "Capture one meaningful moment, take one small step for yourself, learn one relevant thing, and stay connected with your stage — in a few calm minutes a day.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const showRouterDevtools =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("router-devtools");

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <MeProvider>
          <div className="grid min-h-svh grid-rows-[auto_1fr_auto] bg-background">
            <Header />
            <Outlet />
            <Footer />
          </div>
        </MeProvider>
        <Toaster richColors />
      </ThemeProvider>
      {showRouterDevtools ? <TanStackRouterDevtools position="bottom-left" /> : null}
    </>
  );
}

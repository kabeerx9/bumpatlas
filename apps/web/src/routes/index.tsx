import { SignInButton } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Code2, Database, Layers3, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const stackItems = [
  { icon: Layers3, title: "Shared monorepo", body: "Web, native, API, contracts, database, environment, and UI packages wired through pnpm and Turborepo." },
  { icon: Code2, title: "Typed API boundary", body: "Zod contracts and shared API clients keep request and response shapes consistent across platforms." },
  { icon: Database, title: "Production data path", body: "Prisma 7, PostgreSQL, Clerk user sync, and an authenticated reference CRUD flow are already connected." },
  { icon: Smartphone, title: "Native included", body: "Expo Router, Clerk Expo auth, React Query, and reusable native design-system primitives ship with the starter." },
];

function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground">React · Expo · Fastify · Prisma · Clerk</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-normal text-foreground sm:text-6xl lg:text-7xl">
              Fullstack Monorepo Starter
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              A clean TypeScript base for products that need a web app, native app, API, shared contracts,
              authenticated data, and enough tooling to rename the starter safely on day one.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/sign-up" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                Create account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <SignInButton mode="modal">
                <button type="button" className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-medium transition hover:bg-muted">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="border-b border-border pb-4">
              <p className="text-sm font-medium">Starter checklist</p>
              <p className="mt-1 text-sm text-muted-foreground">Run these once after creating a project.</p>
            </div>
            <ol className="mt-5 space-y-4 text-sm">
              {["pnpm install", "pnpm run init:project -- --name ...", "pnpm run doctor", "pnpm run db:generate && pnpm run db:push", "pnpm run dev"].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" aria-hidden="true" />
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item}</code>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="stack" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-normal">What is included</h2>
            <p className="mt-3 text-muted-foreground">
              The starter is intentionally practical: enough product surface to prove the stack works, but isolated so your real domain can replace it.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {stackItems.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-5">
                <item.icon className="size-5 text-emerald-600" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

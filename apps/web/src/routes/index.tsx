import { SignInButton, useAuth } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BookHeart, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const features = [
  {
    icon: BookHeart,
    title: "Memory journal",
    body: "Capture one meaningful moment a day — a photo, a milestone, a line of text — and watch it build into your child's story without a curated feed to perform for.",
  },
  {
    icon: Sparkles,
    title: "Daily gentle challenges",
    body: "A small story prompt and a small wellness step, paired so return visits feel like care instead of another checklist.",
  },
  {
    icon: Users,
    title: "Private stage groups",
    body: "Invite-only spaces for people at your exact stage — pregnancy, newborn, toddler — with no public feed and nothing auto-posted from your journal.",
  },
];

function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
            Pregnancy through early childhood
          </p>
          <h1 className="font-display mt-6 text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
            BumpAtlas
          </h1>
          <p className="landing-prose mt-6 max-w-xl text-balance text-foreground/80">
            Capture one meaningful moment, take one small step for yourself, learn one relevant
            thing, and stay connected with your stage — in a few calm minutes a day.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-up"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Create account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground transition hover:bg-secondary"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">
              A calm daily habit, not another feed
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Three small things, built to keep, not to scroll.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_18px_-4px_rgba(43,35,31,0.06)]"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-accent-foreground">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

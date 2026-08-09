import { SignInButton, useAuth } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/** Inline line icons copied verbatim from the mockup source
 * (docs/design/web-mockups-raw.html) — stroke color is the mockup's link
 * hover token, oklch(38% 0.1 150), not the header/CTA primary. */
function JournalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect
        x="3"
        y="2.5"
        width="14"
        height="15"
        rx="2"
        fill="none"
        stroke="oklch(38% 0.1 150)"
        strokeWidth="1.6"
      />
      <line x1="6.5" y1="7" x2="13.5" y2="7" stroke="oklch(38% 0.1 150)" strokeWidth="1.6" />
      <line x1="6.5" y1="10.5" x2="13.5" y2="10.5" stroke="oklch(38% 0.1 150)" strokeWidth="1.6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.3" fill="none" stroke="oklch(38% 0.1 150)" strokeWidth="1.6" />
      <path
        d="M10 6v4l3 2"
        fill="none"
        stroke="oklch(38% 0.1 150)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="7" cy="7.5" r="2.6" fill="none" stroke="oklch(38% 0.1 150)" strokeWidth="1.6" />
      <circle cx="14" cy="8.5" r="2.1" fill="none" stroke="oklch(38% 0.1 150)" strokeWidth="1.6" />
      <path
        d="M2.8 16c.5-3 2-4.3 4.2-4.3s3.7 1.3 4.2 4.3"
        fill="none"
        stroke="oklch(38% 0.1 150)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12.2 16c.4-2.4 1.6-3.5 3.3-3.5"
        fill="none"
        stroke="oklch(38% 0.1 150)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const features = [
  {
    Icon: JournalIcon,
    title: "Memory journal",
    body: "Capture one meaningful moment a day — a photo, a milestone, a line of text — and watch it build into your child's story without a curated feed to perform for.",
  },
  {
    Icon: ClockIcon,
    title: "Gentle daily challenges",
    body: "A small story prompt and a small wellness step, paired so return visits feel like care instead of another checklist.",
  },
  {
    Icon: PeopleIcon,
    title: "Private stage groups",
    body: "Invite-only spaces for people at your exact stage — pregnancy, newborn, toddler — with no public feed and nothing auto-posted from your journal.",
  },
];

function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden px-4 py-24 text-center sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-140px] left-1/2 size-[520px] -translate-x-1/2 rounded-full"
          style={{ background: "oklch(58% 0.09 150)", opacity: 0.07 }}
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <h1 className="font-display text-4xl leading-[1.15] font-semibold text-foreground sm:text-[44px]">
            One meaningful moment. One small step for yourself.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-[15px] leading-7 text-[#4B4F45]">
            Capture one meaningful moment, take one small step for yourself — in a few calm
            minutes a day.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Open dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-up"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Get started
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-[10px] border border-border bg-background px-7 text-sm font-medium text-foreground transition hover:bg-secondary"
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
            <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
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
                className="card-soft border border-border bg-card p-6"
              >
                <span
                  className="inline-flex size-10 items-center justify-center rounded-[10px]"
                  style={{ background: "oklch(94% 0.03 150)" }}
                >
                  <feature.Icon />
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

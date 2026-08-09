import { SignInButton, UserButton, useAuth } from "@clerk/react";
import { Button } from "@bumpatlas/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";

import { useMe } from "@/context/me-context";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const { isSignedIn } = useAuth();
  const { isAdmin } = useMe();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl flex-row items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-xl text-foreground">
          BumpAtlas
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {isSignedIn ? (
            <>
              <Link
                to="/dashboard"
                className="transition hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                Dashboard
              </Link>
              <Link
                to="/account"
                className="transition hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                Account
              </Link>
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 transition hover:text-foreground"
                  activeProps={{ className: "text-foreground" }}
                >
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
            </>
          ) : (
            <a href="/#features" className="transition hover:text-foreground">
              Features
            </a>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <LogIn className="size-3.5" aria-hidden="true" />
                  Sign in
                </Button>
              </SignInButton>
              <Link
                to="/sign-up"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
              >
                Get started
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

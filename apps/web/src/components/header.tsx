import { SignInButton, useAuth } from "@clerk/react";
import { Button } from "@bumpatlas/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn } from "lucide-react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl flex-row items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold tracking-normal text-foreground">
          BumpAtlas
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="/#stack" className="transition hover:text-foreground">Stack</a>
          {isSignedIn ? <Link to="/dashboard" className="transition hover:text-foreground">Dashboard</Link> : null}
          {isSignedIn ? <Link to="/account" className="transition hover:text-foreground">Account</Link> : null}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isSignedIn ? (
            <Link to="/dashboard" className="text-sm text-muted-foreground transition hover:text-foreground md:hidden">
              Dashboard
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <LogIn className="size-3.5" aria-hidden="true" />
                  Sign in
                </Button>
              </SignInButton>
              <Link to="/sign-up" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90">
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

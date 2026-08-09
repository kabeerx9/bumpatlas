import { cn } from "@bumpatlas/ui/lib/utils";

/** Consistent max-width container + gutters for every authenticated page. */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8", className)}>
      {children}
    </main>
  );
}

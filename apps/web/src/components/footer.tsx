export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {year} BumpAtlas. Made for the calm minutes.</p>
        <p className="text-xs">Private by design — no public feeds, no ads.</p>
      </div>
    </footer>
  );
}

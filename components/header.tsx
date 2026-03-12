export function Header() {
  return (
    <header className="border-b border-cream-8 px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl tracking-wide text-cream">
            PHASE
          </h1>
          <span className="text-cream-20">|</span>
          <span className="font-body text-sm text-cream-40">
            DoubleZero Contributor Tool
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-5 border border-cream-8 px-3 py-1 text-xs text-cream-60">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Live
          </span>
        </div>
      </div>
    </header>
  );
}

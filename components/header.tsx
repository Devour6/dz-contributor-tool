export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-cream-8 bg-dark/80 backdrop-blur-sm px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl tracking-wide text-cream">
            PHASE
          </h1>
          <span className="text-cream-20">|</span>
          <span className="font-body text-sm text-cream-40">
            DoubleZero Network
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="#network"
            className="text-sm text-cream-40 hover:text-cream transition-colors hidden sm:block"
          >
            Network
          </a>
          <a
            href="#contributors"
            className="text-sm text-cream-40 hover:text-cream transition-colors hidden sm:block"
          >
            Contributors
          </a>
          <a
            href="#plan"
            className="text-sm text-cream-40 hover:text-cream transition-colors hidden sm:block"
          >
            Plan a Link
          </a>
          <a
            href="#economics"
            className="text-sm text-cream-40 hover:text-cream transition-colors hidden sm:block"
          >
            Economics
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-5 border border-cream-8 px-3 py-1 text-xs text-cream-60">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Live
          </span>
        </nav>
      </div>
    </header>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#network", label: "Network" },
  { href: "#contributors", label: "Contributors" },
  { href: "#plan", label: "Plan a Link" },
  { href: "#validators", label: "Validators" },
  { href: "#economics", label: "Economics" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-8 bg-dark/80 backdrop-blur-sm px-4 sm:px-6 py-3">
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

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                activeSection === link.href.slice(1)
                  ? "text-cream"
                  : "text-cream-40 hover:text-cream"
              }`}
            >
              {link.label}
            </a>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-5 border border-cream-8 px-3 py-1 text-xs text-cream-60">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Live
          </span>
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 sm:hidden">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-5 border border-cream-8 px-3 py-1 text-xs text-cream-60">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Live
          </span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-cream-40 hover:text-cream transition-colors p-1"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="sm:hidden mt-3 pb-1 border-t border-cream-8 pt-3 flex flex-col">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-sm transition-colors py-2 ${
                activeSection === link.href.slice(1)
                  ? "text-cream"
                  : "text-cream-40 hover:text-cream"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

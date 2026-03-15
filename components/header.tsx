"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { value: "network", label: "Network" },
  { value: "contributors", label: "Contributors" },
  { value: "simulate", label: "Simulate" },
  { value: "validators", label: "Validators" },
  { value: "economics", label: "Economics" },
];

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`text-sm transition-colors ${
                activeTab === item.value
                  ? "text-cream"
                  : "text-cream-40 hover:text-cream"
              }`}
            >
              {item.label}
            </button>
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onTabChange(item.value);
                setMenuOpen(false);
              }}
              className={`text-sm transition-colors py-2 text-left ${
                activeTab === item.value
                  ? "text-cream"
                  : "text-cream-40 hover:text-cream"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

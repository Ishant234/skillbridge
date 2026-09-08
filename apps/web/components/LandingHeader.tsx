"use client";

import Link from "next/link";
import { useState } from "react";
import { Brain, Menu, X, ChevronDown } from "lucide-react";

const nav = [
  { href: "#home", label: "Home" },
  { href: "#learn", label: "Learn" },
  { href: "#hubs", label: "Hubs" },
  { href: "#about", label: "About" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[70px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0" onClick={() => setOpen(false)}>
          <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-brand-dark text-[15px] sm:text-base truncate">SkillBridge</p>
            <p className="text-[11px] text-slate-500 truncate">Karmayogi · NSSTA</p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-brand-dark">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded hover:bg-brand-50 transition-colors inline-flex items-center gap-1"
            >
              {item.label}
              {item.label === "Hubs" && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-brand border border-brand rounded hover:bg-brand-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex px-4 py-2 text-sm font-bold text-brand-dark bg-accent hover:bg-accent-hover rounded transition-colors"
          >
            Register
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 text-brand-dark"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block py-2.5 text-sm font-medium text-brand-dark"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/login"
            className="block sm:hidden py-2.5 text-sm font-medium text-brand"
            onClick={() => setOpen(false)}
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}

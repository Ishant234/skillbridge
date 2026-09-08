"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import {
  Brain,
  LayoutDashboard,
  BookOpen,
  Award,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  BarChart3,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "@/components/app/DashboardProvider";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/competencies", label: "Engine 1", icon: Award, hint: "Competency" },
  { href: "/dashboard/courses", label: "Engine 2", icon: BookOpen, hint: "Recommend" },
  { href: "/dashboard/assessments", label: "Engine 3", icon: ClipboardList, hint: "Assess" },
];

export function AppShell({
  children,
  title,
  subtitle,
  engine,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  engine?: { id: string; name: string };
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, error, banner, setBanner } = useDashboard();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirect: false });
    router.push("/login");
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-ink flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-[62px] flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight min-w-0 hidden xs:block sm:block">
              <p className="font-bold text-brand-dark text-sm truncate">SkillBridge</p>
              <p className="text-[10px] text-slate-500 truncate">iGOT · AI Skill Intelligence</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "text-brand-dark hover:bg-brand-50"
                  }`}
                  title={"hint" in item ? item.hint : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {"hint" in item && item.hint && (
                    <span className={`text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>
                      {item.hint}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-brand border border-brand/40 rounded-md hover:bg-brand-50"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            {(data?.role === "ADMIN" || data?.role === "TRAINER") && (
              <Link
                href="/admin"
                className="hidden md:inline-flex p-2 text-slate-500 hover:text-brand"
                title="Admin"
              >
                <BarChart3 className="w-4 h-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-red-600"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="lg:hidden p-2 text-brand-dark"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2.5 text-sm font-medium ${
                  isActive(item.href) ? "text-brand" : "text-brand-dark"
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
                {"hint" in item && item.hint ? ` · ${item.hint}` : ""}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {engine && <EngineBadge id={engine.id} name={engine.name} />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Mission Karmayogi
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-brand-dark tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {(error || banner) && (
          <div
            className={`flex items-start gap-2 border p-3 rounded-md mb-5 text-sm ${
              error
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">{error ?? banner}</div>
            {banner && !error && (
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-xs font-medium underline shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-[11px] flex flex-col sm:flex-row justify-between gap-1">
          <span>SkillBridge AI · 4 engines · NSSTA / iGOT Karmayogi</span>
          <span>DoPT · Mission Karmayogi</span>
        </div>
      </footer>
    </div>
  );
}

export function EngineBadge({ id, name }: { id: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-brand-dark text-white text-[10px] font-bold px-2 py-0.5 tracking-wide">
      <span className="text-accent">{id}</span>
      <span className="opacity-80">{name}</span>
    </span>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-[36vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <Brain className="w-4 h-4 text-white animate-pulse" />
        </div>
        <p className="text-sm text-slate-500">Syncing learner data…</p>
      </div>
    </div>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  action,
  className = "",
  bodyClassName = "p-4 sm:p-5",
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_2px_rgba(11,61,110,0.04)] ${className}`}>
      {(title || action || eyebrow) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-0.5">
                {eyebrow}
              </p>
            )}
            {title && <h2 className="font-bold text-brand-dark text-sm">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "accent" | "ok" | "warn";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand",
    accent: "bg-orange-50 text-accent-hover",
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </span>
        <span className={`w-7 h-7 rounded-md flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="text-2xl font-bold text-brand-dark tabular-nums">{value}</div>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function EmptyState({ hint, action }: { hint: string; action?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-slate-400 text-sm">{hint}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function CourseCard({
  title,
  subtitle,
  domain,
  durationHrs,
  actionLabel,
  busy,
  onAction,
  rank,
}: {
  title: string;
  subtitle: string;
  domain: string;
  durationHrs: number | null;
  actionLabel: string;
  busy: boolean;
  onAction: () => void;
  rank?: number;
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-brand-200 hover:shadow-sm transition-all bg-white flex flex-col">
      <div className="h-12 bg-gradient-to-r from-brand-dark to-brand relative flex items-end px-3 pb-2">
        {rank != null && (
          <span className="absolute top-2 right-2 text-[10px] font-bold text-brand-dark bg-accent px-1.5 py-0.5 rounded">
            #{rank}
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/90">
          {domain.replace(/_/g, " ")}
        </span>
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-semibold text-brand-dark text-sm leading-snug">{title}</h3>
        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 flex-1">{subtitle}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {durationHrs != null ? `${durationHrs} hrs` : "Self-paced"}
          </span>
          <button
            type="button"
            onClick={onAction}
            disabled={busy}
            className="bg-brand text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

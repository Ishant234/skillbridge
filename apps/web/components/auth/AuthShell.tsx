import Link from "next/link";
import { Brain, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellProps = {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  sidePanel: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  topRight?: ReactNode;
  /** Wider form column for multi-field pages like profile */
  wide?: boolean;
};

export function AuthShell({
  title,
  showBack = false,
  backHref = "/",
  sidePanel,
  children,
  footer,
  topRight,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="auth-hex-bg relative lg:w-[42%] xl:w-[44%] min-h-[280px] lg:min-h-screen flex items-center justify-center p-6 lg:p-10 overflow-hidden">
        <div className="relative z-10 w-full max-w-xl auth-fade-in">{sidePanel}</div>
      </aside>

      <main className="relative flex-1 bg-white flex flex-col min-h-screen">
        {topRight && <div className="absolute top-4 right-4 lg:top-6 lg:right-8 z-10">{topRight}</div>}

        <div
          className={`flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-10 w-full mx-auto ${
            wide ? "max-w-2xl" : "max-w-lg"
          }`}
        >
          <div className="auth-fade-in-delay">
            {(title || showBack) && (
              <div className="flex items-center gap-3 mb-8">
                {showBack && (
                  <Link
                    href={backHref}
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-brand-dark transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                )}
                {title && (
                  <h1 className="text-2xl font-bold text-brand-dark tracking-tight">{title}</h1>
                )}
              </div>
            )}

            {children}

            <div className="mt-8 text-center text-sm text-slate-600">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"}`}>
      <div
        className={`${compact ? "w-12 h-12" : "w-16 h-16"} rounded-full bg-gradient-to-br from-accent via-accent-hover to-brand flex items-center justify-center shadow-lg`}
      >
        <Brain className={`${compact ? "w-6 h-6" : "w-8 h-8"} text-white`} />
      </div>
      <div className="text-center">
        <p className="font-bold text-brand-dark text-lg leading-tight">SkillBridge</p>
        <p className="text-xs text-slate-500">iGOT Karmayogi · NSSTA</p>
      </div>
    </div>
  );
}

type StepItem = {
  number: number;
  title: string;
  body: ReactNode;
  icon?: ReactNode;
};

export function HowToPanel({
  eyebrow = "Welcome to SkillBridge",
  heading,
  steps,
}: {
  eyebrow?: string;
  heading: string;
  steps: StepItem[];
}) {
  return (
    <div className="text-white">
      <div className="text-center mb-8 lg:mb-10">
        <p className="text-accent font-semibold text-sm sm:text-base mb-1">{eyebrow}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-accent drop-shadow-sm">{heading}</h2>
        <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-accent/80" />
      </div>

      <div className="grid gap-5 sm:gap-6">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-4 items-start">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-accent text-brand-dark font-bold flex items-center justify-center shadow-md">
                {step.number}
              </div>
              {step.icon && (
                <div className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-white">
                  {step.icon}
                </div>
              )}
            </div>
            <div className="pt-1">
              <p className="font-semibold text-accent text-sm mb-1">{step.title}</p>
              <div className="text-white/90 text-sm leading-relaxed">{step.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stepper({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
            current >= 1 ? "bg-accent text-white" : "bg-slate-200 text-slate-500"
          }`}
        >
          1
        </div>
        <span className="text-xs text-slate-500 mt-1.5">Step - 1</span>
      </div>
      <div
        className={`w-16 sm:w-24 h-0.5 mb-5 mx-1 ${current >= 2 ? "bg-brand" : "bg-brand/40"}`}
      />
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
            current >= 2 ? "bg-accent text-white" : "bg-brand-100 text-brand-dark"
          }`}
        >
          2
        </div>
        <span className="text-xs text-slate-500 mt-1.5">Step - 2</span>
      </div>
    </div>
  );
}

export function AuthMessage({
  type,
  text,
}: {
  type: "success" | "error" | "warning";
  text: string;
}) {
  const styles =
    type === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : type === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <div className={`mb-4 rounded-md px-3 py-2.5 text-sm border ${styles}`}>{text}</div>
  );
}

/** Three-step onboarding: Register → Profile → Dashboard */
export function ProfileStepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Account" },
    { n: 2 as const, label: "Profile" },
    { n: 3 as const, label: "Learn" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                current >= step.n
                  ? "bg-accent text-white"
                  : "bg-brand-100 text-brand-dark"
              }`}
            >
              {step.n}
            </div>
            <span className="text-xs text-slate-500 mt-1.5">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 sm:w-14 h-0.5 mb-5 mx-1 ${
                current > step.n ? "bg-brand" : "bg-brand/30"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const authInputClass =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand disabled:bg-slate-50 disabled:text-slate-500";

export const authPrimaryBtnClass =
  "w-full bg-brand text-white py-2.5 rounded-md font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2";

export const authLinkClass = "text-brand font-medium hover:underline";

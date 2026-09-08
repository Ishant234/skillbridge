"use client";

import Link from "next/link";
import {
  Target,
  BookOpen,
  Award,
  ClipboardList,
  ChevronRight,
  RefreshCw,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AppShell, PageLoading, Panel, Kpi, EngineBadge } from "@/components/app/AppShell";
import { useDashboard } from "@/components/app/DashboardProvider";
import { ReadinessGauge, EnrollmentStatusChart } from "@/components/app/charts";
import { formatDomain } from "@/lib/dashboard-types";

const ENGINES = [
  {
    id: "E1",
    name: "Competency",
    href: "/dashboard/competencies",
    desc: "RAG-grounded skill inference from your profile",
    icon: Award,
    key: "scores" as const,
  },
  {
    id: "E2",
    name: "Recommend",
    href: "/dashboard/courses",
    desc: "Ranked iGOT / NSSTA pathways for your gaps",
    icon: BookOpen,
    key: "recommendations" as const,
  },
  {
    id: "E3",
    name: "Assess",
    href: "/dashboard/assessments",
    desc: "Quizzes, score analytics, and retests",
    icon: ClipboardList,
    key: "assessments" as const,
  },
  {
    id: "E4",
    name: "Remediate",
    href: "/dashboard/assessments",
    desc: "Weak-topic modules after quiz attempts",
    icon: Sparkles,
    key: "remediation" as const,
  },
];

export default function DashboardOverviewPage() {
  const { data, loading, refresh } = useDashboard();

  if (loading && !data) {
    return (
      <AppShell title="Command centre" subtitle="Loading learner intelligence…">
        <PageLoading />
      </AppShell>
    );
  }

  const readiness = data?.overallReadiness ?? null;
  const allGaps = [...(data?.scores ?? [])]
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap);
  const topGaps = allGaps.slice(0, 4);
  const topRecs = (data?.recommendations ?? []).slice(0, 3);
  const recentEnroll = (data?.enrollments ?? []).slice(0, 4);
  const lastAttempt = data?.quizAttempts?.[0];

  const engineStatus = (key: (typeof ENGINES)[number]["key"]) => {
    const n =
      key === "scores"
        ? data?.scores.length ?? 0
        : key === "recommendations"
          ? data?.recommendations.length ?? 0
          : key === "assessments"
            ? data?.assessments.length ?? 0
            : data?.remediation.length ?? 0;
    if (n > 0) return { label: "Active", tone: "ok" as const, detail: `${n} items` };
    return { label: "Pending", tone: "warn" as const, detail: "No output yet" };
  };

  return (
    <AppShell
      title={data?.profile?.designation ? `${data.profile.designation}` : "Learner command centre"}
      subtitle={
        data?.profile?.department
          ? `${data.profile.department}${data.profile.jobRole ? ` · ${data.profile.jobRole}` : ""} — AI skill intelligence for Mission Karmayogi`
          : "AI skill intelligence pipeline — competency → recommend → assess → remediate"
      }
      actions={
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-2 bg-brand text-white hover:bg-brand-dark font-semibold px-3.5 py-2 rounded-md text-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </button>
      }
    >
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-5">
          <Panel eyebrow="Capacity signal" title="Overall readiness">
            <ReadinessGauge value={readiness} />
            <div className="grid grid-cols-2 gap-2 -mt-2">
              <Kpi
                label="Skills"
                value={String(data?.scores.length ?? 0)}
                icon={Target}
                hint="Tracked"
              />
              <Kpi
                label="Gaps"
                value={String(allGaps.length)}
                icon={Award}
                tone="accent"
                hint="Open"
              />
            </div>
          </Panel>

          <Panel eyebrow="Profile" title="Learner identity">
            {data?.profile ? (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Designation</dt>
                  <dd className="font-medium text-brand-dark text-right">{data.profile.designation}</dd>
                </div>
                {data.profile.department && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Department</dt>
                    <dd className="font-medium text-brand-dark text-right">{data.profile.department}</dd>
                  </div>
                )}
                {data.profile.jobRole && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Job role</dt>
                    <dd className="font-medium text-brand-dark text-right">{data.profile.jobRole}</dd>
                  </div>
                )}
                <Link href="/profile" className="inline-flex items-center gap-1 text-brand text-xs font-semibold pt-1 hover:underline">
                  Edit profile <ChevronRight className="w-3 h-3" />
                </Link>
              </dl>
            ) : (
              <div className="text-sm text-slate-600">
                <p className="mb-3">Profile required before Engine 1 can infer competencies.</p>
                <Link
                  href="/profile"
                  className="inline-flex bg-brand text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-brand-dark"
                >
                  Complete profile
                </Link>
              </div>
            )}
          </Panel>
        </div>

        {/* Main */}
        <div className="lg:col-span-8 space-y-5">
          <Panel
            eyebrow="Pipeline"
            title="AI engines"
            action={<span className="text-[11px] text-slate-400">4-stage SkillBridge stack</span>}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {ENGINES.map((eng) => {
                const Icon = eng.icon;
                const status = engineStatus(eng.key);
                return (
                  <Link
                    key={eng.id}
                    href={eng.href}
                    className="group flex gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand hover:bg-brand-50/40 transition-all"
                  >
                    <div className="w-10 h-10 rounded-md bg-brand-dark text-white flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <EngineBadge id={eng.id} name={eng.name} />
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            status.tone === "ok" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{eng.desc}</p>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        {status.detail}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand" />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <div className="grid md:grid-cols-2 gap-5">
            <Panel
              eyebrow="Engine 1 preview"
              title="Priority gaps"
              action={
                <Link href="/dashboard/competencies" className="text-xs font-semibold text-brand hover:underline">
                  Full analysis
                </Link>
              }
            >
              {!topGaps.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No open gaps yet — run competency assessment from profile.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {topGaps.map((g, i) => (
                    <li key={`${g.skillName}-${i}`} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-accent/20 text-accent-hover text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-dark truncate">{g.skillName}</p>
                        <p className="text-[11px] text-slate-500">{formatDomain(g.domain)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600">−{g.gap}</p>
                        <p className="text-[10px] text-slate-400">
                          {g.currentLevel}/{g.requiredLevel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              eyebrow="Engine 2 preview"
              title="Top recommendations"
              action={
                <Link href="/dashboard/courses" className="text-xs font-semibold text-brand hover:underline">
                  Learn hub
                </Link>
              }
            >
              {!topRecs.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No AI picks yet — refresh recommendations after assessment.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {topRecs.map((r, i) => (
                    <li key={r.id} className="flex gap-3">
                      <span className="text-accent font-bold text-sm tabular-nums">0{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-dark leading-snug">{r.course.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {r.reason ?? formatDomain(r.course.domain)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Panel eyebrow="Learn" title="Enrollment status">
              <EnrollmentStatusChart enrollments={data?.enrollments ?? []} />
            </Panel>

            <Panel eyebrow="Learn" title="Active enrollments">
              {!recentEnroll.length ? (
                <p className="text-sm text-slate-400 py-6 text-center">No enrollments yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentEnroll.map((e) => (
                    <li
                      key={e.id}
                      className="py-2.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0"
                    >
                      <p className="text-sm text-brand-dark truncate">{e.course.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
                        {e.status.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-3 hover:underline"
              >
                Open Learn hub <ChevronRight className="w-3 h-3" />
              </Link>
            </Panel>

            <Panel eyebrow="Engine 3 pulse" title="Latest assessment">
              {lastAttempt ? (
                <div>
                  <p className="text-sm font-medium text-brand-dark">{lastAttempt.assessment.title}</p>
                  <p className="text-3xl font-bold text-brand mt-2 tabular-nums">
                    {lastAttempt.score}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    Weak topics: {lastAttempt.weakTopics.slice(0, 3).join(", ") || "—"}
                  </p>
                  <Link
                    href="/dashboard/assessments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-3 hover:underline"
                  >
                    Open assessments <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-4">
                  <Brain className="w-5 h-5 text-brand-200 mb-2" />
                  No quiz attempts yet. Enroll, then take an assessment.
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

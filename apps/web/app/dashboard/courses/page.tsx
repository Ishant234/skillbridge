"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Loader2, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";
import {
  AppShell,
  PageLoading,
  Panel,
  Kpi,
  EmptyState,
  CourseCard,
} from "@/components/app/AppShell";
import { useDashboard } from "@/components/app/DashboardProvider";
import { STATUS_BADGES, formatDomain } from "@/lib/dashboard-types";

type Tab = "recommended" | "enrolled" | "catalogue";

export default function CoursesPage() {
  const { data, loading, enroll, enrollingId, generateRecs, recLoading } = useDashboard();
  const [tab, setTab] = useState<Tab>("recommended");

  const counts = useMemo(
    () => ({
      recommended: data?.recommendations.length ?? 0,
      enrolled: data?.enrollments.length ?? 0,
      catalogue: data?.availableCourses.length ?? 0,
    }),
    [data],
  );

  if (loading && !data) {
    return (
      <AppShell
        engine={{ id: "E2", name: "Recommend" }}
        title="Recommendation engine"
        subtitle="Loading learning pathways…"
      >
        <PageLoading />
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "recommended", label: "AI recommended", count: counts.recommended },
    { id: "enrolled", label: "My learning", count: counts.enrolled },
    { id: "catalogue", label: "Catalogue", count: counts.catalogue },
  ];

  return (
    <AppShell
      engine={{ id: "E2", name: "Recommend" }}
      title="Learning pathways"
      subtitle="Ranked courses from iGOT Karmayogi & NSSTA matched to your competency gaps."
      actions={
        <button
          type="button"
          onClick={generateRecs}
          disabled={recLoading}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-brand-dark font-bold px-3.5 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {recLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          {recLoading ? "Generating…" : "Refresh AI picks"}
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Recommended" value={String(counts.recommended)} icon={Sparkles} hint="Engine 2" />
        <Kpi label="Enrolled" value={String(counts.enrolled)} icon={BookOpen} hint="Active + done" />
        <Kpi
          label="Completed"
          value={String(data?.completedCourses.length ?? 0)}
          icon={CheckCircle2}
          tone="ok"
        />
        <Kpi
          label="Catalogue left"
          value={String(counts.catalogue)}
          icon={BookOpen}
          tone="accent"
          hint={data?.igotCatalogueCount != null ? `${data.igotCatalogueCount} iGOT feed` : undefined}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[11px] ${tab === t.id ? "text-white/70" : "text-slate-400"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {tab === "recommended" && (
          <Panel eyebrow="Engine 2" title="Matched to your gaps">
            {!data?.recommendations.length ? (
              <EmptyState
                hint="No recommendations yet. Complete competency assessment, then refresh AI picks."
                action={
                  <Link href="/dashboard/competencies" className="text-sm font-semibold text-brand hover:underline">
                    Open Engine 1 →
                  </Link>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.recommendations.map((r, i) => (
                  <CourseCard
                    key={r.id}
                    rank={i + 1}
                    title={r.course.title}
                    subtitle={r.reason ?? "Matched to your competency gaps"}
                    domain={r.course.domain}
                    durationHrs={r.course.durationHrs}
                    actionLabel="Enroll"
                    busy={enrollingId === r.courseId}
                    onAction={() => enroll(r.courseId)}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {tab === "enrolled" && (
          <Panel eyebrow="Progress" title="My courses">
            {!data?.enrollments.length ? (
              <EmptyState hint="Enroll from AI recommended or the catalogue to start learning." />
            ) : (
              <ul className="space-y-2">
                {data.enrollments.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-slate-200 rounded-md"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-dark text-sm">{e.course.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {e.course.source.replace(/_/g, " ")} · {formatDomain(e.course.domain)}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide w-fit ${
                        STATUS_BADGES[e.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {e.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "catalogue" && (
          <Panel eyebrow="iGOT + NSSTA" title="Open catalogue">
            {!data?.availableCourses.length ? (
              <EmptyState hint="You are enrolled in all available courses." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.availableCourses.map((c) => (
                  <CourseCard
                    key={c.id}
                    title={c.title}
                    subtitle={c.source.replace(/_/g, " ")}
                    domain={c.domain}
                    durationHrs={c.durationHrs}
                    actionLabel="Enroll"
                    busy={enrollingId === c.id}
                    onAction={() => enroll(c.id)}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

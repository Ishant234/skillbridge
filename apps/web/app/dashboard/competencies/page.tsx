"use client";

import Link from "next/link";
import { Target, AlertTriangle, Layers } from "lucide-react";
import { AppShell, PageLoading, Panel, Kpi, EmptyState } from "@/components/app/AppShell";
import { useDashboard } from "@/components/app/DashboardProvider";
import {
  DomainRadarChart,
  SkillGapBarChart,
  DomainCompareBars,
} from "@/components/app/charts";
import { formatDomain } from "@/lib/dashboard-types";

export default function CompetenciesPage() {
  const { data, loading } = useDashboard();

  if (loading && !data) {
    return (
      <AppShell
        engine={{ id: "E1", name: "Competency" }}
        title="Competency engine"
        subtitle="Loading FRAC-aligned skill inference…"
      >
        <PageLoading />
      </AppShell>
    );
  }

  const scores = data?.scores ?? [];
  const gaps = scores.filter((s) => s.gap > 0).sort((a, b) => b.gap - a.gap);
  const covered = scores.filter((s) => s.gap <= 0).length;

  return (
    <AppShell
      engine={{ id: "E1", name: "Competency" }}
      title="Competency assessment"
      subtitle="RAG-grounded inference across Statistical, Technical, Digital Governance, and Behavioural domains."
      actions={
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 border border-brand text-brand hover:bg-brand-50 font-semibold px-3.5 py-2 rounded-md text-sm"
        >
          Re-run via profile
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Readiness"
          value={data?.overallReadiness != null ? `${data.overallReadiness}%` : "—"}
          icon={Target}
          hint="Gap-adjusted coverage"
        />
        <Kpi label="Skills scored" value={String(scores.length)} icon={Layers} hint="Engine 1 output" />
        <Kpi
          label="Open gaps"
          value={String(gaps.length)}
          icon={AlertTriangle}
          tone="accent"
          hint="Below required"
        />
        <Kpi
          label="At target"
          value={String(covered)}
          icon={Target}
          tone="ok"
          hint="Meets required level"
        />
      </div>

      {!scores.length ? (
        <Panel>
          <EmptyState
            hint="Engine 1 has no scores yet. Complete your official profile to trigger competency inference."
            action={
              <Link
                href="/profile"
                className="inline-flex bg-brand text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-brand-dark"
              >
                Complete profile
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-5 gap-5">
            <Panel className="lg:col-span-2" eyebrow="Domain map" title="Competency radar">
              <DomainRadarChart scores={scores} />
            </Panel>
            <Panel className="lg:col-span-3" eyebrow="Comparison" title="Domain averages">
              <DomainCompareBars scores={scores} />
            </Panel>
          </div>

          <Panel eyebrow="Gap analytics" title="Current vs required levels">
            <SkillGapBarChart scores={scores} />
            <p className="text-[11px] text-slate-500 mt-1">
              Blue = current proficiency · Orange = role-required level (FRAC-style)
            </p>
          </Panel>

          <Panel
            eyebrow="Action list"
            title="Priority skill gaps"
            action={
              <Link href="/dashboard/courses" className="text-xs font-semibold text-brand hover:underline">
                Get recommendations →
              </Link>
            }
          >
            {!gaps.length ? (
              <EmptyState hint="All tracked skills meet required levels." />
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-semibold pl-1">#</th>
                      <th className="pb-2 font-semibold">Skill</th>
                      <th className="pb-2 font-semibold">Domain</th>
                      <th className="pb-2 font-semibold text-right">Current</th>
                      <th className="pb-2 font-semibold text-right">Required</th>
                      <th className="pb-2 font-semibold text-right pr-1">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((s, i) => (
                      <tr key={`${s.skillName}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="py-2.5 pl-1 text-slate-400 tabular-nums">{i + 1}</td>
                        <td className="py-2.5 font-medium text-brand-dark">{s.skillName}</td>
                        <td className="py-2.5 text-slate-600">{formatDomain(s.domain)}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.currentLevel}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.requiredLevel}</td>
                        <td className="py-2.5 text-right pr-1">
                          <span className="inline-flex text-[11px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded">
                            {s.gap}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </AppShell>
  );
}

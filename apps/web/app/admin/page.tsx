"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Brain,
  Users,
  BookOpen,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  FileQuestion,
  StickyNote,
  LogOut,
  LayoutDashboard,
  User,
} from "lucide-react";
import {
  Panel,
  Kpi,
  EngineBadge,
  EmptyState,
  PageLoading,
} from "@/components/app/AppShell";
import {
  EnrollmentStatusChart,
  OrgDomainBars,
  SkillDemandBars,
} from "@/components/app/charts";
import { authInputClass } from "@/components/auth/AuthShell";
import { DOMAIN_LABELS } from "@/lib/dashboard-types";

interface AnalyticsData {
  userCount: number;
  totalEnrollments: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  domainDistribution: { domain: string; avgCurrentLevel: number }[];
  completedCourses: number;
  enrollmentByStatus?: {
    ENROLLED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
  };
  courseOutcomes: {
    courseId: string;
    courseTitle?: string;
    totalAttempts?: number;
    passRate?: number;
    avgScore?: number;
  }[];
  skillDemand: { domain: string; skillName: string; avgGap: number }[];
  courses: { id: string; title: string; domain: string }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [courseId, setCourseId] = useState("");
  const [assessmentTitle, setAssessmentTitle] = useState("Module Assessment");
  const [extractedText, setExtractedText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    fetch("/api/admin/analytics", { signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        if (r.status === 403) {
          throw new Error(
            "Admin/Trainer access required. Promote your user role to ADMIN in the database.",
          );
        }
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setData(d);
        if (d.courses?.[0]?.id) setCourseId(d.courses[0].id);
      })
      .catch((e) => {
        if (e?.name === "AbortError") {
          setError("Admin analytics timed out. Refresh the page.");
        } else {
          setError(e.message ?? "Failed to load analytics");
        }
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [router]);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirect: false });
    router.push("/login");
  };

  const generateMcqs = async () => {
    if (!courseId) return;
    setBusy("mcq");
    setBanner(null);
    try {
      const res = await fetch("/api/assessments/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: assessmentTitle || "Module Assessment",
          extractedText: extractedText.trim() || undefined,
          numQuestions: 8,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "MCQ generation failed");
      setBanner(`Created assessment with ${body.assessment?.questions?.length ?? 0} questions.`);
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "MCQ generation failed");
    } finally {
      setBusy(null);
    }
  };

  const generateNotes = async () => {
    if (!courseId && !extractedText.trim()) return;
    setBusy("notes");
    setBanner(null);
    setNotes(null);
    try {
      const res = await fetch("/api/assessments/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId || undefined,
          extractedText: extractedText.trim() || undefined,
          title: assessmentTitle,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Notes generation failed");
      setNotes(body.notes ?? "");
      setBanner("Study notes generated.");
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Notes generation failed");
    } finally {
      setBusy(null);
    }
  };

  const uploadMaterial = async (file: File) => {
    if (!courseId) {
      setBanner("Select a course first.");
      return;
    }
    setUploadBusy(true);
    setBanner(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/courses/${courseId}/materials`, {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");
      setBanner(`Material uploaded: ${body.chunkCount} chunks, ${body.embeddedCount} embedded.`);
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-ink flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-[62px] flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-bold text-brand-dark text-sm truncate">SkillBridge</p>
              <p className="text-[10px] text-slate-500 truncate">Admin · Org analytics</p>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            <span className="px-3 py-1.5 rounded-md bg-brand text-white inline-flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </span>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-brand-dark hover:bg-brand-50 inline-flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Learner hub
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-brand border border-brand/40 rounded-md hover:bg-brand-50"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-red-600"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <EngineBadge id="ORG" name="Analytics" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Mission Karmayogi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-dark tracking-tight">
            Admin &amp; trainer console
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Org-wide competency signals, course outcomes, and Engine 2 content tools — aligned to
            iGOT Karmayogi capacity building.
          </p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Kpi label="Learners" value={String(data?.userCount ?? 0)} icon={Users} hint="Registered" />
          <Kpi
            label="Enrollments"
            value={String(data?.totalEnrollments ?? 0)}
            icon={BookOpen}
            hint={`${data?.completedCourses ?? 0} completed`}
          />
          <Kpi
            label="Avg quiz score"
            value={`${data?.avgScore ?? 0}%`}
            icon={BarChart3}
            tone="ok"
          />
          <Kpi
            label="Pass rate"
            value={`${data?.passRate ?? 0}%`}
            icon={CheckCircle}
            tone="accent"
            hint="Score ≥ 60%"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-5 mb-5">
          <Panel className="lg:col-span-4" eyebrow="Org mix" title="Enrollment status">
            <EnrollmentStatusChart
              counts={
                data?.enrollmentByStatus ?? {
                  ENROLLED: Math.max(
                    0,
                    (data?.totalEnrollments ?? 0) - (data?.completedCourses ?? 0),
                  ),
                  IN_PROGRESS: 0,
                  COMPLETED: data?.completedCourses ?? 0,
                }
              }
            />
          </Panel>
          <Panel className="lg:col-span-8" eyebrow="Engine 1 rollup" title="Org competency by domain">
            <OrgDomainBars domains={data?.domainDistribution ?? []} />
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Panel eyebrow="Demand" title="Emerging skill gaps">
            <SkillDemandBars skills={data?.skillDemand ?? []} />
            {!!data?.skillDemand?.length && (
              <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
                {data.skillDemand.slice(0, 4).map((s) => (
                  <li
                    key={`${s.domain}-${s.skillName}`}
                    className="flex justify-between text-xs gap-2"
                  >
                    <span className="text-slate-700 truncate">
                      {s.skillName}{" "}
                      <span className="text-slate-400">
                        ({DOMAIN_LABELS[s.domain] ?? s.domain})
                      </span>
                    </span>
                    <span className="font-bold text-accent-hover shrink-0">gap {s.avgGap}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="Effectiveness" title="Training pulse">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-md bg-brand-50 border border-brand-100 p-3 text-center">
                <div className="text-xl font-bold text-brand-dark tabular-nums">
                  {data?.totalAttempts ?? 0}
                </div>
                <div className="text-[11px] text-brand mt-0.5">Attempts</div>
              </div>
              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-center">
                <div className="text-xl font-bold text-emerald-800 tabular-nums">
                  {data?.completedCourses ?? 0}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Completed</div>
              </div>
              <div className="rounded-md bg-orange-50 border border-orange-100 p-3 text-center">
                <div className="text-xl font-bold text-accent-hover tabular-nums">
                  {data?.passRate ?? 0}%
                </div>
                <div className="text-[11px] text-accent-hover mt-0.5">Pass rate</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aggregated locally from enrollments and quiz attempts — same signals used for iGOT /
              NSSTA capacity reporting.
            </p>
          </Panel>
        </div>

        <Panel
          className="mb-5"
          eyebrow="Engine 2 · Trainer"
          title="Content tools"
          action={
            <span className="text-[11px] text-slate-400">MCQs · notes · materials</span>
          }
        >
          <p className="text-sm text-slate-600 mb-4">
            Upload course material (.txt / .pdf), then generate MCQs or study notes. Large documents
            use RAG retrieval automatically.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className={authInputClass}
              >
                {(data?.courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Assessment title
              </label>
              <input
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                className={authInputClass}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Optional source text
            </label>
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={4}
              placeholder="Paste course text here for MCQ / notes generation…"
              className={authInputClass}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="inline-flex items-center gap-2 text-sm px-3.5 py-2 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 font-medium text-slate-700">
              <Upload className="w-4 h-4 text-brand" />
              {uploadBusy ? "Uploading…" : "Upload .txt / .pdf"}
              <input
                type="file"
                accept=".txt,.pdf"
                className="hidden"
                disabled={uploadBusy || !courseId}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMaterial(f);
                }}
              />
            </label>
            <button
              type="button"
              onClick={generateMcqs}
              disabled={!!busy || !courseId}
              className="inline-flex items-center gap-2 bg-brand text-white px-3.5 py-2 rounded-md text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              {busy === "mcq" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileQuestion className="w-4 h-4" />
              )}
              Generate MCQs
            </button>
            <button
              type="button"
              onClick={generateNotes}
              disabled={!!busy}
              className="inline-flex items-center gap-2 bg-brand-dark text-white px-3.5 py-2 rounded-md text-sm font-semibold hover:bg-brand disabled:opacity-50"
            >
              {busy === "notes" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StickyNote className="w-4 h-4 text-accent" />
              )}
              Generate notes
            </button>
          </div>
          {notes && (
            <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-200 whitespace-pre-wrap text-sm text-slate-700 max-h-72 overflow-y-auto">
              {notes}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Engine 2 outcomes" title="Course outcomes">
          {!data?.courseOutcomes?.length ? (
            <EmptyState hint="No quiz outcomes yet across the organisation." />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-semibold pl-1">Course</th>
                    <th className="pb-2 font-semibold text-right">Attempts</th>
                    <th className="pb-2 font-semibold text-right">Avg score</th>
                    <th className="pb-2 font-semibold text-right pr-1">Pass rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.courseOutcomes.map((o) => (
                    <tr
                      key={o.courseId}
                      className="border-b border-slate-50 hover:bg-slate-50/80"
                    >
                      <td className="py-2.5 pl-1 font-medium text-brand-dark">
                        {o.courseTitle ?? o.courseId}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{o.totalAttempts ?? 0}</td>
                      <td className="py-2.5 text-right tabular-nums">{o.avgScore ?? 0}%</td>
                      <td className="py-2.5 text-right pr-1 tabular-nums font-semibold text-brand">
                        {o.passRate ?? 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </main>

      <footer className="border-t border-slate-200 bg-white text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-[11px] flex flex-col sm:flex-row justify-between gap-1">
          <span>SkillBridge Admin · Org analytics · NSSTA / iGOT</span>
          <span>DoPT · Mission Karmayogi</span>
        </div>
      </footer>
    </div>
  );
}

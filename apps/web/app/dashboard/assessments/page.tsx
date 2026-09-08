"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Play, RefreshCw, Lightbulb, ClipboardList, TrendingUp, Wrench } from "lucide-react";
import {
  AppShell,
  PageLoading,
  Panel,
  Kpi,
  EmptyState,
  CourseCard,
} from "@/components/app/AppShell";
import { useDashboard } from "@/components/app/DashboardProvider";
import { QuizScoreTrendChart } from "@/components/app/charts";

export default function AssessmentsPage() {
  const { data, loading, enroll, enrollingId, setBanner, refresh } = useDashboard();
  const [activeQuiz, setActiveQuiz] = useState<{
    id: string;
    title: string;
    questions: {
      id: string;
      questionText: string;
      options: string[];
      correctOptionIndex: number;
    }[];
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizBusy, setQuizBusy] = useState(false);
  const [remediationBusy, setRemediationBusy] = useState<string | null>(null);

  const avgScore =
    data?.quizAttempts.length
      ? Math.round(
          data.quizAttempts.reduce((s, a) => s + a.score, 0) / data.quizAttempts.length,
        )
      : null;

  const openQuiz = async (assessmentId: string) => {
    setQuizBusy(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load quiz");
      setActiveQuiz({
        id: body.assessment.id,
        title: body.assessment.title,
        questions: body.assessment.questions,
      });
      setAnswers({});
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Quiz load failed");
    } finally {
      setQuizBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizBusy(true);
    try {
      let correct = 0;
      const weakTopics: string[] = [];
      for (const q of activeQuiz.questions) {
        if (answers[q.id] === q.correctOptionIndex) correct += 1;
        else weakTopics.push(q.questionText.slice(0, 60));
      }
      const score = Math.round(
        (correct / Math.max(activeQuiz.questions.length, 1)) * 100,
      );
      const res = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: activeQuiz.id,
          score,
          weakTopics: weakTopics.length ? weakTopics.slice(0, 5) : ["general review"],
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Submit failed");
      setBanner(`Submitted — ${score}%. Use Engine 4 remediation or Engine 3 retest as needed.`);
      setActiveQuiz(null);
      await refresh();
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setQuizBusy(false);
    }
  };

  const requestRetest = async (assessmentId: string, quizAttemptId?: string) => {
    setQuizBusy(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/retest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizAttemptId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Retest failed");
      setBanner("Retest ready.");
      setActiveQuiz({
        id: body.assessment.id,
        title: body.assessment.title,
        questions: body.assessment.questions,
      });
      setAnswers({});
      await refresh();
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Retest failed");
    } finally {
      setQuizBusy(false);
    }
  };

  const requestRemediation = async (quizAttemptId: string) => {
    setRemediationBusy(quizAttemptId);
    try {
      const res = await fetch("/api/remediation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizAttemptId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Remediation unavailable");
      setBanner(`Engine 4 ready — ${body.modulesToRedo?.length ?? 0} modules.`);
      await refresh();
    } catch (e: unknown) {
      setBanner(e instanceof Error ? e.message : "Remediation failed");
    } finally {
      setRemediationBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <AppShell
        engine={{ id: "E3", name: "Assess" }}
        title="Assessment engine"
        subtitle="Loading quizzes…"
      >
        <PageLoading />
      </AppShell>
    );
  }

  return (
    <AppShell
      engine={{ id: "E3", name: "Assess" }}
      title="Assessments & remediation"
      subtitle="Engine 3 quizzes and retests · Engine 4 weak-topic remediation after attempts."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Quizzes"
          value={String(data?.assessments.length ?? 0)}
          icon={ClipboardList}
          hint="For enrolled courses"
        />
        <Kpi
          label="Attempts"
          value={String(data?.quizAttempts.length ?? 0)}
          icon={TrendingUp}
        />
        <Kpi
          label="Avg score"
          value={avgScore != null ? `${avgScore}%` : "—"}
          icon={TrendingUp}
          tone="ok"
        />
        <Kpi
          label="Remediation"
          value={String(data?.remediation.length ?? 0)}
          icon={Wrench}
          tone="accent"
          hint="Engine 4 modules"
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-5 mb-5">
        <Panel className="lg:col-span-7" eyebrow="Analytics" title="Score trend">
          <QuizScoreTrendChart attempts={data?.quizAttempts ?? []} />
        </Panel>
        <Panel className="lg:col-span-5" eyebrow="Engine 3" title="Ready to take">
          {!data?.assessments.length ? (
            <EmptyState
              hint="Quizzes appear after you enroll in a course."
              action={
                <Link href="/dashboard/courses" className="text-sm font-semibold text-brand hover:underline">
                  Go to Learn (E2) →
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {data.assessments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 p-2.5 border border-slate-200 rounded-md"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {a.courseTitle} · {a.questionCount} Qs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openQuiz(a.id)}
                    disabled={quizBusy}
                    className="shrink-0 inline-flex items-center gap-1 bg-brand text-white px-2.5 py-1.5 rounded text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
                  >
                    {quizBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Start
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel eyebrow="History" title="Attempts · retest · remediate" className="mb-5">
        {!data?.quizAttempts.length ? (
          <EmptyState hint="Submit a quiz to unlock retests (E3) and remediation (E4)." />
        ) : (
          <ul className="space-y-2">
            {data.quizAttempts.map((a) => (
              <li
                key={a.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 border border-slate-200 rounded-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-brand-dark text-sm">{a.assessment.title}</p>
                    <span
                      className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded ${
                        a.score >= 70
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {a.score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    Weak: {a.weakTopics.slice(0, 3).join(", ") || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => requestRetest(a.assessmentId, a.id)}
                    disabled={quizBusy}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Retest
                  </button>
                  <button
                    type="button"
                    onClick={() => requestRemediation(a.id)}
                    disabled={remediationBusy === a.id}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-brand-dark text-white hover:bg-brand font-semibold"
                  >
                    {remediationBusy === a.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Lightbulb className="w-3 h-3 text-accent" />
                    )}
                    Engine 4
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!!data?.remediation?.length && (
        <Panel eyebrow="Engine 4" title="Remediation plan">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.remediation.map((r) => (
              <CourseCard
                key={r.id}
                title={r.course.title}
                subtitle={r.reason ?? "Remediation module"}
                domain={r.course.domain}
                durationHrs={null}
                actionLabel="Enroll"
                busy={enrollingId === r.courseId}
                onAction={() => enroll(r.courseId)}
              />
            ))}
          </div>
        </Panel>
      )}

      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-brand-dark/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 bg-brand-dark text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-accent text-[10px] font-bold uppercase tracking-wider">
                  Engine 3 · Assessment
                </p>
                <h2 className="font-bold text-sm sm:text-base">{activeQuiz.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
                className="text-xs text-white/75 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-5">
              {activeQuiz.questions.map((q, idx) => (
                <div key={q.id}>
                  <p className="font-medium text-brand-dark text-sm mb-2">
                    <span className="text-accent font-bold mr-1.5">{idx + 1}.</span>
                    {q.questionText}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-start gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 transition-colors ${
                          answers[q.id] === oi
                            ? "border-brand bg-brand-50 text-brand-dark"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === oi}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                          className="mt-0.5"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={submitQuiz}
                disabled={
                  quizBusy || Object.keys(answers).length < activeQuiz.questions.length
                }
                className="w-full bg-brand text-white py-2.5 rounded-md font-semibold hover:bg-brand-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {quizBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

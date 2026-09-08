"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  User,
  Briefcase,
  BookOpen,
  Loader2,
  HelpCircle,
  Award,
  Sparkles,
} from "lucide-react";
import {
  AuthShell,
  BrandMark,
  HowToPanel,
  AuthMessage,
  ProfileStepper,
  authInputClass,
  authPrimaryBtnClass,
  authLinkClass,
} from "@/components/auth/AuthShell";

const JOB_ROLES = [
  "Statistical Officer",
  "Data Analyst",
  "Senior Director",
  "GIS Specialist",
  "IT Officer",
  "Survey Officer",
  "Policy Analyst",
  "Research Officer",
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(
    null,
  );
  const [form, setForm] = useState({
    designation: "",
    department: "",
    jobRole: "",
    currentAssignment: "",
    education: "",
    workExperience: "",
    priorTrainings: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.role === "ADMIN" || data.role === "TRAINER") {
          router.replace("/admin");
          return;
        }
        if (data.profile) {
          setForm({
            designation: data.profile.designation ?? "",
            department: data.profile.department ?? "",
            jobRole: data.profile.jobRole ?? "",
            currentAssignment: data.profile.currentAssignment ?? "",
            education: data.profile.education ?? "",
            workExperience: data.profile.workExperience ?? "",
            priorTrainings: data.profile.priorTrainings ?? "",
          });
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [router]);

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const warnings = [data.assessmentWarning, data.recommendationsWarning].filter(Boolean);
      if (warnings.length) {
        setMsg({ type: "warning", text: warnings.join(" ") });
      } else if (data.assessmentRan) {
        setMsg({
          type: "success",
          text: "Profile saved. Competency assessed — opening dashboard…",
        });
      } else {
        setMsg({ type: "success", text: "Profile saved." });
      }

      const dest = data.redirectTo ?? "/dashboard";
      router.push(dest);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save profile";
      setMsg({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 auth-fade-in">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent via-accent-hover to-brand flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
          <p className="text-sm text-slate-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      wide
      title="Update Profile"
      showBack
      backHref="/dashboard"
      topRight={
        <Link
          href="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50"
          aria-label="Help / Home"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>
      }
      sidePanel={
        <HowToPanel
          eyebrow="Welcome to SkillBridge"
          heading="How To Complete Profile"
          steps={[
            {
              number: 1,
              title: "Share your official role",
              icon: <User className="w-3.5 h-3.5" />,
              body: (
                <p>
                  Enter designation, department, and job role — the same details you would update on
                  iGOT Karmayogi under View Profile.
                </p>
              ),
            },
            {
              number: 2,
              title: "Describe your assignment",
              icon: <Briefcase className="w-3.5 h-3.5" />,
              body: (
                <p>
                  Add current work, education, and prior trainings so recommendations match your
                  ministry / MDO context.
                </p>
              ),
            },
            {
              number: 3,
              title: "AI competency assessment",
              icon: <Award className="w-3.5 h-3.5" />,
              body: (
                <p>
                  On save, Engine 1 assesses competencies across domains, then chains into course
                  recommendations from iGOT &amp; NSSTA.
                </p>
              ),
            },
            {
              number: 4,
              title: "Continue to Learn hub",
              icon: <Sparkles className="w-3.5 h-3.5" />,
              body: (
                <p>
                  You will land on your dashboard with personalised pathways — similar to guided
                  onboarding on the Karmayogi portal.
                </p>
              ),
            },
          ]}
        />
      }
      footer={
        <>
          Prefer to explore first?{" "}
          <button type="button" onClick={() => router.push("/dashboard")} className={authLinkClass}>
            Skip to dashboard
          </button>
        </>
      }
    >
      <div className="mb-6">
        <BrandMark compact />
      </div>

      <ProfileStepper current={2} />

      <p className="text-center text-sm text-slate-600 mb-6 -mt-2">
        Complete your Karmayogi-style profile for competency inference
      </p>

      {msg && <AuthMessage type={msg.type} text={msg.text} />}

      <form onSubmit={submit} className="space-y-5">
        <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/60 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-50 text-brand flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-brand-dark">Official details</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.designation}
                onChange={set("designation")}
                className={authInputClass}
                placeholder="e.g. Deputy Director"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Department / MDO <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.department}
                onChange={set("department")}
                className={authInputClass}
                placeholder="e.g. MoSPI"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Job Role <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.jobRole}
              onChange={set("jobRole")}
              className={authInputClass}
            >
              <option value="">Select job role</option>
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Current Assignment <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.currentAssignment}
              onChange={set("currentAssignment")}
              className={authInputClass}
              placeholder="What are you working on now?"
            />
          </div>
        </div>

        <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/60 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-50 text-brand flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-brand-dark">Learning background</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Education</label>
            <input
              value={form.education}
              onChange={set("education")}
              className={authInputClass}
              placeholder="Degrees, certifications…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Work Experience
            </label>
            <textarea
              value={form.workExperience}
              onChange={set("workExperience")}
              rows={3}
              className={authInputClass}
              placeholder="A few sentences about statistics, tools, surveys, coding…"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Richer detail improves AI competency mapping — similar to updating skills on iGOT.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Prior Trainings
            </label>
            <textarea
              value={form.priorTrainings}
              onChange={set("priorTrainings")}
              rows={2}
              className={authInputClass}
              placeholder="Courses or programmes you have already completed…"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Saving & assessing…" : "Save profile & run assessment"}
        </button>
      </form>
    </AuthShell>
  );
}

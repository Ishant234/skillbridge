"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { domainAverages, DOMAIN_LABELS, type DashboardData } from "@/lib/dashboard-types";

const BRAND = "#0068b4";
const NAVY = "#0b3d6e";
const ACCENT = "#f99d1c";
const MUTED = "#8eb8d9";
const SLATE = "#94a3b8";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
};

export function DomainRadarChart({ scores }: { scores: DashboardData["scores"] }) {
  const data = domainAverages(scores).map((d) => ({
    subject: d.label,
    level: d.avg,
    fullMark: 100,
  }));

  if (!data.length) {
    return <ChartEmpty />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#c5d9eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#374957", fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="Current level"
          dataKey="level"
          stroke={BRAND}
          fill={BRAND}
          fillOpacity={0.35}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function SkillGapBarChart({ scores }: { scores: DashboardData["scores"] }) {
  const data = scores.slice(0, 10).map((s) => ({
    name: s.skillName.length > 18 ? `${s.skillName.slice(0, 16)}…` : s.skillName,
    current: s.currentLevel,
    required: s.requiredLevel,
    gap: Math.max(s.gap, 0),
  }));

  if (!data.length) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-25} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="current" name="Current" fill={BRAND} radius={[4, 4, 0, 0]} />
        <Bar dataKey="required" name="Required" fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EnrollmentStatusChart({
  enrollments,
  counts: countsProp,
}: {
  enrollments?: DashboardData["enrollments"];
  counts?: { ENROLLED?: number; IN_PROGRESS?: number; COMPLETED?: number };
}) {
  const counts = { ENROLLED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  if (countsProp) {
    counts.ENROLLED = countsProp.ENROLLED ?? 0;
    counts.IN_PROGRESS = countsProp.IN_PROGRESS ?? 0;
    counts.COMPLETED = countsProp.COMPLETED ?? 0;
  } else {
    (enrollments ?? []).forEach((e) => {
      if (e.status in counts) counts[e.status as keyof typeof counts] += 1;
      else counts.ENROLLED += 1;
    });
  }

  const data = [
    { name: "Enrolled", value: counts.ENROLLED, color: BRAND },
    { name: "In progress", value: counts.IN_PROGRESS, color: ACCENT },
    { name: "Completed", value: counts.COMPLETED, color: "#059669" },
  ].filter((d) => d.value > 0);

  if (!data.length) return <ChartEmpty message="No enrollment data yet" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function QuizScoreTrendChart({
  attempts,
}: {
  attempts: DashboardData["quizAttempts"];
}) {
  const data = [...attempts]
    .reverse()
    .map((a, i) => ({
      label: `Q${i + 1}`,
      score: a.score,
      name: a.assessment.title.slice(0, 20),
    }));

  if (!data.length) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`${value}%`, "Score"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={NAVY}
          strokeWidth={2.5}
          dot={{ fill: ACCENT, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DomainCompareBars({ scores }: { scores: DashboardData["scores"] }) {
  const data = domainAverages(scores);

  if (!data.length) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "#374957" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="avg" name="Avg level" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? BRAND : MUTED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrgDomainBars({
  domains,
}: {
  domains: { domain: string; avgCurrentLevel: number }[];
}) {
  const data = domains.map((d) => ({
    label: DOMAIN_LABELS[d.domain] ?? d.domain.replace(/_/g, " "),
    avg: d.avgCurrentLevel,
  }));

  if (!data.length) return <ChartEmpty message="No org competency data yet" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "#374957" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="avg" name="Org avg" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? BRAND : MUTED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillDemandBars({
  skills,
}: {
  skills: { skillName: string; avgGap: number; domain: string }[];
}) {
  const data = skills.slice(0, 8).map((s) => ({
    name: s.skillName.length > 16 ? `${s.skillName.slice(0, 14)}…` : s.skillName,
    gap: s.avgGap,
  }));

  if (!data.length) return <ChartEmpty message="No skill demand gaps yet" />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="gap" name="Avg gap" fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty({ message }: { message?: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-slate-400 px-4 text-center">
      {message ?? "Complete your profile to unlock competency charts"}
    </div>
  );
}

export function ReadinessGauge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const data = [
    { name: "ready", value: v },
    { name: "gap", value: Math.max(0, 100 - v) },
  ];

  return (
    <div className="relative h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="55%"
            startAngle={180}
            endAngle={0}
            innerRadius={68}
            outerRadius={92}
            stroke="none"
          >
            <Cell fill={BRAND} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="text-3xl font-bold text-brand-dark tabular-nums">
          {value != null ? `${value}%` : "—"}
        </span>
        <span className="text-[11px] text-slate-500 font-medium">Readiness</span>
      </div>
    </div>
  );
}

export { BRAND, ACCENT, NAVY, SLATE };

export type DashboardData = {
  scores: {
    domain: string;
    skillName: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
  }[];
  enrollments: {
    id: string;
    status: string;
    courseId: string;
    course: {
      title: string;
      source: string;
      domain: string;
      durationHrs: number | null;
    };
  }[];
  recommendations: {
    id: string;
    courseId: string;
    reason: string | null;
    score: number;
    course: { title: string; domain: string; durationHrs: number | null };
  }[];
  remediation: {
    id: string;
    courseId: string;
    reason: string | null;
    score: number;
    course: { title: string; domain: string };
  }[];
  profile: {
    designation: string;
    department?: string;
    jobRole?: string;
  } | null;
  overallReadiness: number | null;
  role?: string;
  availableCourses: {
    id: string;
    title: string;
    domain: string;
    source: string;
    durationHrs: number | null;
  }[];
  completedCourses: { id: string; course: { title: string } }[];
  assessments: {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
    questionCount: number;
  }[];
  quizAttempts: {
    id: string;
    score: number;
    weakTopics: string[];
    assessmentId: string;
    assessment: { title: string; course: { title: string } };
  }[];
  igotCatalogueCount?: number;
};

export const DOMAIN_LABELS: Record<string, string> = {
  STATISTICAL: "Statistical",
  TECHNICAL: "Technical",
  DIGITAL_GOVERNANCE: "Digital Gov.",
  BEHAVIOURAL: "Behavioural",
};

export const STATUS_BADGES: Record<string, string> = {
  ENROLLED: "bg-brand-50 text-brand-dark",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
};

export function formatDomain(domain: string) {
  return DOMAIN_LABELS[domain] ?? domain.replace(/_/g, " ");
}

export function domainAverages(scores: DashboardData["scores"]) {
  const groups: Record<string, number[]> = {};
  scores.forEach((s) => {
    if (!groups[s.domain]) groups[s.domain] = [];
    groups[s.domain].push(s.currentLevel);
  });
  return Object.entries(groups).map(([domain, levels]) => ({
    domain,
    label: formatDomain(domain),
    avg: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length),
  }));
}

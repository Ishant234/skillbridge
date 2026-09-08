import Link from "next/link";
import {
  Brain,
  BookOpen,
  MessagesSquare,
  Users,
  Briefcase,
  Award,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { LandingHeader } from "@/components/LandingHeader";

const hubs = [
  {
    title: "Learn",
    desc: "Courses and pathways from iGOT & NSSTA",
    icon: BookOpen,
    href: "#learn",
  },
  {
    title: "Discuss",
    desc: "Share ideas and seek guidance",
    icon: MessagesSquare,
    href: "/login",
  },
  {
    title: "Network",
    desc: "Connect across ministries and departments",
    icon: Users,
    href: "/login",
  },
  {
    title: "Career",
    desc: "Explore roles aligned to competencies",
    icon: Briefcase,
    href: "/login",
  },
  {
    title: "Competencies",
    desc: "Assess and track skill levels",
    icon: Award,
    href: "#about",
  },
  {
    title: "Events",
    desc: "Workshops, webinars and programmes",
    icon: CalendarDays,
    href: "/login",
  },
];

const featured = [
  {
    domain: "Statistical",
    title: "Survey Methods & Sampling Design",
    provider: "NSSTA",
    duration: "4 hrs",
  },
  {
    domain: "Technical",
    title: "Data Analysis for Official Statistics",
    provider: "iGOT Karmayogi",
    duration: "6 hrs",
  },
  {
    domain: "Digital",
    title: "Digital Governance Foundations",
    provider: "iGOT Karmayogi",
    duration: "3 hrs",
  },
  {
    domain: "Behavioural",
    title: "Leadership & Collaborative Working",
    provider: "Mission Karmayogi",
    duration: "2 hrs",
  },
];

export default function Home() {
  return (
    <div id="home" className="min-h-screen bg-white text-ink">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark to-brand/80" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 lg:py-20 grid lg:grid-cols-[1.25fr_0.75fr] gap-8 lg:gap-12 items-center">
            <div>
              <p className="landing-fade-up text-accent font-semibold text-sm mb-2">
                Mission Karmayogi · Capacity Building
              </p>
              <h1 className="landing-fade-up-delay text-white text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1] mb-4">
                SkillBridge
              </h1>
              <p className="landing-fade-up-delay text-white/85 text-base sm:text-lg max-w-xl leading-relaxed mb-7">
                AI-enabled skill intelligence for India&apos;s Official Statistical System —
                competency assessment, curated learning, and remediation on one platform.
              </p>
              <div className="landing-fade-up-delay-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-brand-dark font-bold px-5 py-2.5 rounded transition-colors"
                >
                  Register <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 border border-white/70 text-white hover:bg-white/10 font-semibold px-5 py-2.5 rounded transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div className="landing-fade-up-delay-2 hidden lg:block">
              <div className="border border-white/20 rounded-lg p-5 text-white">
                <p className="text-accent text-sm font-semibold mb-3">Platform at a glance</p>
                <ul className="space-y-2.5 text-sm text-white/90">
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">01</span>
                    Competency assessment across four domains
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">02</span>
                    Course recommendations from iGOT &amp; NSSTA
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">03</span>
                    AI-generated quizzes, notes and remediation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Hubs */}
        <section id="hubs" className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-[1.75rem] font-bold text-brand-dark">Explore the hubs</h2>
            <p className="mt-1.5 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Structured like iGOT Karmayogi — learn, discuss, network, and grow competencies in one
              place.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {hubs.map((hub) => {
              const Icon = hub.icon;
              return (
                <a key={hub.title} href={hub.href} className="hub-tile group text-center p-1.5">
                  <div className="hub-icon mx-auto mb-2.5 w-12 h-12 rounded-full bg-brand-50 text-brand border border-brand-100 flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-brand-dark text-sm">{hub.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{hub.desc}</p>
                </a>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-8 bg-brand">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-5 text-center text-white">
            {[
              { n: "4", l: "Competency domains" },
              { n: "4", l: "AI engines" },
              { n: "6", l: "Learning hubs" },
              { n: "NSSTA", l: "Official statistics focus" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl sm:text-3xl font-bold text-accent">{s.n}</div>
                <div className="text-sm text-white/85 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured courses */}
        <section id="learn" className="bg-[#f5f8fb] py-12 sm:py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
              <div>
                <h2 className="text-2xl sm:text-[1.75rem] font-bold text-brand-dark">
                  Featured courses
                </h2>
                <p className="mt-1.5 text-slate-600 text-sm sm:text-base">
                  Open learning pathways aligned to statistical competency needs.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                View all courses <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((course) => (
                <Link
                  key={course.title}
                  href="/login"
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md hover:border-brand-100 transition-all"
                >
                  <div className="h-20 bg-gradient-to-br from-brand-dark to-brand relative">
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wide bg-accent text-brand-dark px-2 py-0.5 rounded">
                      {course.domain}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-semibold text-brand-dark text-[15px] leading-snug min-h-[2.5em]">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2.5 flex justify-between gap-2">
                      <span>{course.provider}</span>
                      <span>{course.duration}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div>
              <p className="text-accent font-semibold text-sm mb-1.5">About SkillBridge</p>
              <h2 className="text-2xl sm:text-[1.75rem] font-bold text-brand-dark mb-3">
                Built for Mission Karmayogi. Focused on official statistics.
              </h2>
              <p className="text-slate-600 leading-relaxed mb-3 text-[15px]">
                SkillBridge helps officials in India&apos;s Official Statistical System understand
                skill gaps and follow a clear learning path — assessment, recommendation, practice,
                and remediation.
              </p>
              <p className="text-slate-600 leading-relaxed text-[15px]">
                Designed with NSSTA and aligned to the iGOT Karmayogi ecosystem so capacity building
                stays competency-driven and measurable.
              </p>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-5 sm:p-6">
              <h3 className="font-bold text-brand-dark mb-3">How SkillBridge works</h3>
              <ol className="space-y-3">
                {[
                  "Register with your official email and verify with OTP",
                  "Complete your profile for competency inference",
                  "Receive ranked course recommendations",
                  "Take AI-generated assessments and follow remediation plans",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link
                href="/register"
                className="mt-5 inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded transition-colors text-sm"
              >
                Get started <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-brand-deep text-white/75 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">SkillBridge</span>
            </div>
            <p className="text-sm leading-relaxed">
              Skill intelligence platform for capacity building under Mission Karmayogi.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3">Navigate</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#home" className="hover:text-accent">
                  Home
                </a>
              </li>
              <li>
                <a href="#learn" className="hover:text-accent">
                  Learn
                </a>
              </li>
              <li>
                <a href="#hubs" className="hover:text-accent">
                  Hubs
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-accent">
                  About
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-accent">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-accent">
                  Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white text-sm mb-3">Partners</p>
            <ul className="space-y-2 text-sm">
              <li>NSSTA</li>
              <li>iGOT Karmayogi</li>
              <li>DoPT · Mission Karmayogi</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 text-xs text-white/50 flex flex-col sm:flex-row justify-between gap-2">
            <span>© 2026 SkillBridge · SIH 2026</span>
            <span>Integrated with iGOT Karmayogi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

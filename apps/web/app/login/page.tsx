"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Mail, Lock, HelpCircle } from "lucide-react";
import {
  AuthShell,
  BrandMark,
  HowToPanel,
  AuthMessage,
  authInputClass,
  authPrimaryBtnClass,
  authLinkClass,
} from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sendOtp = async () => {
    if (!email) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("otp");
      setMessage({ type: "success", text: "OTP sent! Check your email (or console in dev mode)" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send OTP";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user.role === "ADMIN" || data.user.role === "TRAINER") {
        router.push("/admin");
      } else {
        router.push(data.user.profileCompleted ? "/dashboard" : "/profile");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid OTP";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
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
          heading="How To Login"
          steps={[
            {
              number: 1,
              title: "In case you face issues while logging in with your email ID",
              icon: <Lock className="w-3.5 h-3.5" />,
              body: (
                <ul className="list-disc list-inside space-y-1.5 text-white/85 italic">
                  <li>Clear your browser cache and cookies, then try again</li>
                  <li>Use a private / incognito window</li>
                  <li>Ensure you are using your registered official email</li>
                </ul>
              ),
            },
            {
              number: 2,
              title: "Login with OTP or Google",
              icon: <Mail className="w-3.5 h-3.5" />,
              body: (
                <ul className="list-disc list-inside space-y-1.5 text-white/85 italic">
                  <li>Enter your registered email and request an OTP</li>
                  <li>Enter the 6-digit code sent to your inbox</li>
                  <li>Or continue with Google linked to your official account</li>
                  <li>New users are created automatically on first verified login</li>
                </ul>
              ),
            },
          ]}
        />
      }
      footer={
        <>
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className={authLinkClass}>
            Register here
          </Link>
        </>
      }
    >
      <div className="mb-8">
        <BrandMark />
      </div>

      <div className="flex items-center gap-6 mb-6 text-sm">
        <label className="flex items-center gap-2 cursor-default text-slate-800 font-medium">
          <span className="w-4 h-4 rounded-full border-2 border-brand flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-brand" />
          </span>
          Login with OTP
        </label>
        <span className="text-slate-400 text-xs">(email verification)</span>
      </div>

      {message && <AuthMessage type={message.type} text={message.text} />}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gov.in"
            className={authInputClass}
            disabled={step === "otp"}
          />
        </div>

        {step === "otp" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-800">OTP</label>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setMessage(null);
                }}
                className={`text-sm ${authLinkClass}`}
              >
                Change email
              </button>
            </div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className={`${authInputClass} text-center tracking-[0.35em] font-mono text-lg`}
            />
          </div>
        )}

        {step === "email" ? (
          <button
            onClick={sendOtp}
            disabled={loading || !email}
            className={authPrimaryBtnClass}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Sending..." : "Send OTP"}
          </button>
        ) : (
          <button
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            className={authPrimaryBtnClass}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Verifying..." : "Login"}
          </button>
        )}
      </div>

      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 py-0.5 rounded-full border border-slate-200 text-slate-400">
            or
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-800 mb-1.5">
          Login with Providers
        </label>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/api/auth/google-callback" })}
          className="w-full flex items-center justify-between gap-3 bg-brand text-white px-4 py-2.5 rounded-md font-medium hover:bg-brand-dark transition-colors"
        >
          <span className="flex items-center gap-3">
            <svg className="w-5 h-5 bg-white rounded-sm p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </span>
          <span className="text-white/70 text-lg leading-none">▾</span>
        </button>
      </div>
    </AuthShell>
  );
}

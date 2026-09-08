"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Mail, Users, Search, Monitor } from "lucide-react";
import {
  AuthShell,
  HowToPanel,
  Stepper,
  AuthMessage,
  authInputClass,
  authPrimaryBtnClass,
  authLinkClass,
} from "@/components/auth/AuthShell";

/**
 * Register uses the same email OTP flow as login (§5 Step 1).
 * OTP verify auto-creates the User if missing.
 */
export default function RegisterPage() {
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
      setMessage({
        type: "success",
        text: "OTP sent! Check the Next.js terminal for [DEV OTP] if email is not configured.",
      });
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to send OTP" });
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
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Register"
      showBack
      backHref="/"
      sidePanel={
        <HowToPanel
          eyebrow="Welcome to SkillBridge"
          heading="How To Register"
          steps={[
            {
              number: 1,
              title: "Official email",
              icon: <Mail className="w-3.5 h-3.5" />,
              body: (
                <p>
                  Prefer registering with your government / official email ID on the SkillBridge
                  platform (integrated with iGOT Karmayogi).
                </p>
              ),
            },
            {
              number: 2,
              title: "Need help onboarding?",
              icon: <Users className="w-3.5 h-3.5" />,
              body: (
                <p>
                  If you do not have a government email ID, contact your organisation admin to
                  onboard you with your mobile number and personal email.
                </p>
              ),
            },
            {
              number: 3,
              title: "Verify with OTP",
              icon: <Search className="w-3.5 h-3.5" />,
              body: (
                <p>
                  Enter your email, send OTP, and verify to create your account. You can complete
                  your profile after registration.
                </p>
              ),
            },
            {
              number: 4,
              title: "Or continue with Google",
              icon: <Monitor className="w-3.5 h-3.5" />,
              body: (
                <p>
                  Use Google sign-in if your official account is linked. New users are created
                  automatically after successful verification.
                </p>
              ),
            },
          ]}
        />
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in here
          </Link>
        </>
      }
    >
      <Stepper current={step === "email" ? 1 : 2} />

      {message && <AuthMessage type={message.type} text={message.text} />}

      <div className="space-y-5">
        <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/60 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your government email address"
              className={authInputClass}
              disabled={step === "otp"}
            />
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Not able to proceed? Get registered through your organisation admin.{" "}
              <Link href="/" className={authLinkClass}>
                Click here
              </Link>{" "}
              to return home.
            </p>
          </div>

          {step === "otp" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-800">
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setMessage(null);
                  }}
                  className={`text-xs ${authLinkClass}`}
                >
                  Change email
                </button>
              </div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className={`${authInputClass} text-center tracking-[0.35em] font-mono text-lg`}
              />
            </div>
          )}

          {step === "email" && (
            <div className="flex justify-end">
              <button
                onClick={sendOtp}
                disabled={loading || !email}
                className="bg-brand-dark text-white px-5 py-2 rounded-md font-semibold hover:bg-brand disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={step === "email" || loading || otp.length !== 6}
          onClick={verifyOtp}
          className={authPrimaryBtnClass}
        >
          {loading && step === "otp" && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading && step === "otp" ? "Verifying..." : "Next"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/api/auth/google-callback" })}
          className="flex items-center justify-center gap-3 w-full border border-slate-300 py-2.5 rounded-md hover:bg-slate-50 font-medium text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        </button>
      </div>
    </AuthShell>
  );
}

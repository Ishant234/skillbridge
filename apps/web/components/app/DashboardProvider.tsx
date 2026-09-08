"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { DashboardData } from "@/lib/dashboard-types";

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  banner: string | null;
  setBanner: (msg: string | null) => void;
  refresh: () => Promise<void>;
  enroll: (courseId: string) => Promise<void>;
  enrollingId: string | null;
  generateRecs: () => Promise<void>;
  recLoading: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = useCallback(
    async (courseId: string) => {
      setEnrollingId(courseId);
      try {
        const res = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Enroll failed");
        setBanner(null);
        await refresh();
      } catch (e: unknown) {
        setBanner(e instanceof Error ? e.message : "Enrollment failed");
      } finally {
        setEnrollingId(null);
      }
    },
    [refresh],
  );

  const generateRecs = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await fetch("/api/recommendations/generate", { method: "POST" });
      const body = await res.json();
      if (body.warning) setBanner(body.warning);
      else setBanner(null);
      await refresh();
    } catch {
      setBanner("Recommendations temporarily unavailable.");
    } finally {
      setRecLoading(false);
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      banner,
      setBanner,
      refresh,
      enroll,
      enrollingId,
      generateRecs,
      recLoading,
    }),
    [
      data,
      loading,
      error,
      banner,
      refresh,
      enroll,
      enrollingId,
      generateRecs,
      recLoading,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

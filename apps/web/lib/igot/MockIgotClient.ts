// MockIgotClient.ts — Mock implementation of the iGOT adapter
// Returns data from seed/courses.json; pushEnrollment is a no-op.

import path from "path";
import { readFileSync } from "fs";
import type { IgotClient, CourseRecord, EnrollmentStatusRecord } from "./IgotClient";

/** Strip // line comments so seed fixtures with TODOs still parse. */
function parseJsonWithComments<T>(raw: string): T {
  const stripped = raw
    .split("\n")
    .map((line) => (line.trim().startsWith("//") ? "" : line))
    .join("\n");
  return JSON.parse(stripped) as T;
}

export class MockIgotClient implements IgotClient {
  private catalogue: CourseRecord[] | null = null;

  private loadCatalogue(): CourseRecord[] {
    if (this.catalogue) return this.catalogue;
    const filePath = path.join(process.cwd(), "seed", "courses.json");
    try {
      const data = parseJsonWithComments<CourseRecord[]>(readFileSync(filePath, "utf-8"));
      this.catalogue = data;
    } catch (err) {
      console.warn("[MockIgotClient] Could not load seed/courses.json — returning empty catalogue", err);
      this.catalogue = [];
    }
    return this.catalogue;
  }

  async getCourseCatalogue(): Promise<CourseRecord[]> {
    return this.loadCatalogue();
  }

  async getEnrollmentStatus(userId: string, courseId: string): Promise<EnrollmentStatusRecord | null> {
    console.log(`[MockIgotClient] getEnrollmentStatus called for user=${userId} course=${courseId}`);
    // Deterministic mock: alternate IN_PROGRESS / COMPLETED by courseId hash
    const completed = courseId.length % 2 === 0;
    return {
      userId,
      courseId,
      status: completed ? "COMPLETED" : "IN_PROGRESS",
    };
  }

  async pushEnrollment(userId: string, courseId: string): Promise<void> {
    console.log(`[MockIgotClient] pushEnrollment: user=${userId} enrolled in course=${courseId}`);
  }
}

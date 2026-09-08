// IgotClient.ts — Interface for iGOT Karmayogi API
// This interface makes a future swap from mock to live trivial via IGOT_MODE env var.

export interface CourseRecord {
  externalId: string;
  source: "IGOT_KARMAYOGI" | "NSSTA_TPAC";
  title: string;
  description: string;
  domain: "STATISTICAL" | "TECHNICAL" | "DIGITAL_GOVERNANCE" | "BEHAVIOURAL";
  skillTags: string[];
  durationHrs?: number;
}

export interface EnrollmentStatusRecord {
  userId: string;
  courseId: string;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED";
  completedAt?: Date;
}

export interface IgotClient {
  /**
   * Returns the full course catalogue from iGOT Karmayogi and NSSTA TPAC.
   * In mock mode: returns data from seed/courses.json
   */
  getCourseCatalogue(): Promise<CourseRecord[]>;

  /**
   * Returns the current enrollment status for a user in a specific course.
   * In mock mode: returns a mocked status.
   */
  getEnrollmentStatus(userId: string, courseId: string): Promise<EnrollmentStatusRecord | null>;

  /**
   * Pushes an enrollment event to iGOT Karmayogi.
   * In mock mode: logs the action and no-ops.
   */
  pushEnrollment(userId: string, courseId: string): Promise<void>;
}

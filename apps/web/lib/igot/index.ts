// index.ts — Exports the active iGOT client based on IGOT_MODE env var.
// Set IGOT_MODE=mock  → uses MockIgotClient (default, this build)
// Set IGOT_MODE=live  → swap in a real LiveIgotClient here when ready.

import type { IgotClient } from "./IgotClient";
import { MockIgotClient } from "./MockIgotClient";

const mode = process.env.IGOT_MODE ?? "mock";

let client: IgotClient;

if (mode === "mock") {
  client = new MockIgotClient();
} else {
  // TODO: Replace with LiveIgotClient when IGOT_MODE=live is supported.
  console.warn("[igot] IGOT_MODE is set to a non-mock value but no live client exists. Falling back to mock.");
  client = new MockIgotClient();
}

export const igotClient = client;
export type { IgotClient, CourseRecord, EnrollmentStatusRecord } from "./IgotClient";

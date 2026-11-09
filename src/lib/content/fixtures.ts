/** Seed fixtures for tests and initial database import; never a runtime fallback. */

import {
  ContentBundleSchema,
  type LearningSummary,
} from "@/lib/content/schema";
import raw from "../../../content/competition.json";
export const CONTENT_FIXTURE = ContentBundleSchema.parse(raw);
export const MODULE_FIXTURES: LearningSummary[] = CONTENT_FIXTURE.modules.map(
  (m) => ({ ...m.metadata, ready: !!m.content }),
);
export const SIMULATION_FIXTURE = CONTENT_FIXTURE.simulations[0];

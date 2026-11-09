import type { Risk } from "@/lib/contracts/score";

/** The verdict vocabulary Lumina stores and displays. */
export type LokerSentinelStatus = "clean" | "suspicious" | "rejected";

/**
 * `LokerSentinelStatus` is already declared in this file by Task 8. Do NOT
 * re-declare it here — duplicate exports fail typecheck.
 */

/** One posting as the server loads it and the client renders it. */
export interface LokerView {
  urlKey: string;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryText: string | null;
  tags: string[];
  description: string;
  applyUrl: string | null;
  source: string;
  postedAt: string | null;
  fetchedAt: string;
  companyEmail: string;
  domainAgeDays: number;
  employerKnown: boolean;
  sentinelStatus: LokerSentinelStatus;
  sentinelFlags: string[];
  trustScore: number;
  trustLevel: string;
  luminaScore: number;
  luminaRisk: Risk;
  luminaSignals: { label: string; weight: number }[];
}

/** What the RSC loader hands the client. */
export interface LokerCorpus {
  postings: LokerView[];
  total: number;
  capped: boolean;
}

export interface ScanRunStatus {
  status: "running" | "ok" | "failed";
  found: number;
  added: number;
  dropped: number;
  finishedAt: string | null;
}

/** The device-local snapshot written to `localStorage`. */
export interface SavedLoker {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryText: string | null;
  sentinelStatus: LokerSentinelStatus;
  luminaRisk: Risk;
  savedAt: string;
}

/** The subset of `JobSearchArgs` the filter needs; Task 15 declares the schema. */
export interface LokerSearchArgs {
  query: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  hideFlagged?: boolean;
}

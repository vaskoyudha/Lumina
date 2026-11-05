import { z } from "zod";
import { type ModuleContent, ModuleContentSchema } from "@/data/modul-schema";

/**
 * Admin drafts — plan `stream-b-admin-crud.md`, Task 1.3.
 *
 * A draft is *not* published content. It lives on this device only, so the
 * product stays static: nothing the editor does can break `/belajar` until the
 * draft is exported and committed. That is also why deleting a draft is honest
 * and deleting a published course is a `git rm`, not a fake button.
 */

export const DRAFT_KEY = "lumina-admin-draft-v1";

/** Metadata that belongs to `modus.json`, not to the lesson body. */
export const CourseMetaSchema = z.object({
  nama: z.string().min(3, "Nama course terlalu pendek"),
  level: z.number().int().min(1).max(5),
  ciri: z.array(z.string().min(3)).min(1).max(4),
  /** IASC complaint count, or null when the figure is not a count. */
  laporan: z.number().int().nonnegative().nullable(),
  laporanNote: z.string().min(1).nullable(),
  kerugian: z.string().min(1),
});

export type CourseMeta = z.infer<typeof CourseMetaSchema>;

export const CourseDraftSchema = z.object({
  no: z.number().int().min(1).max(99),
  meta: CourseMetaSchema,
  content: ModuleContentSchema,
  updatedAt: z.string(),
});

export type CourseDraft = z.infer<typeof CourseDraftSchema>;

/**
 * Storage is deliberately lenient: a draft is work in progress, and a
 * half-typed title must survive a reload. Semantic rules (min lengths, orphan
 * answers) are enforced by `validateDraft` at export time, never here — a
 * strict read would silently delete the draft someone is still writing.
 */
const StoredCourseSchema = z.object({
  no: z.number().int().min(1).max(99),
  meta: z.record(z.string(), z.unknown()),
  content: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

const StoreSchema = z.object({
  version: z.literal(1),
  courses: z.array(StoredCourseSchema),
});

export type DraftStore = { version: 1; courses: CourseDraft[] };

export const EMPTY_STORE: DraftStore = { version: 1, courses: [] };

/** Fired after every write so sibling islands re-read the same store. */
export const DRAFT_EVENT = "lumina:admin-drafts";

/**
 * Drafts written before the four-shape example change store their segments
 * under `contohPesan`. Rename on read so an open draft survives the schema
 * change — an undefined `contohIsi` used to crash the editor at
 * `contohIsi.map`, which made an otherwise fine draft unreachable.
 */
function migrateContent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...content };
  if (!Array.isArray(next.contohIsi)) {
    next.contohIsi = Array.isArray(next.contohPesan) ? next.contohPesan : [];
  }
  delete next.contohPesan;
  if (next.contohJenis === undefined) next.contohJenis = "pesan";
  if (typeof next.contohSumber !== "string") next.contohSumber = "";
  return next;
}

export function loadDrafts(): DraftStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = StoreSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return EMPTY_STORE;
    // Cast is safe for the fields the editor reads; anything semantic is
    // checked by `validateDraft` before export.
    return {
      version: 1,
      courses: parsed.data.courses.map((course) => ({
        ...course,
        content: migrateContent(course.content),
      })) as unknown as CourseDraft[],
    };
  } catch {
    return EMPTY_STORE;
  }
}

export function saveDrafts(store: DraftStore): void {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

export function upsertDraft(draft: CourseDraft): DraftStore {
  const store = loadDrafts();
  const courses = store.courses.filter((c) => c.no !== draft.no);
  const next: DraftStore = {
    version: 1,
    courses: [
      ...courses,
      { ...draft, updatedAt: new Date().toISOString() },
    ].sort((a, b) => a.no - b.no),
  };
  saveDrafts(next);
  return next;
}

export function removeDraft(no: number): DraftStore {
  const store = loadDrafts();
  const next: DraftStore = {
    version: 1,
    courses: store.courses.filter((c) => c.no !== no),
  };
  saveDrafts(next);
  return next;
}

/** Highest course number taken by either published content or a draft. */
export function nextCourseNo(published: readonly number[]): number {
  const taken = new Set<number>([
    ...published,
    ...loadDrafts().courses.map((c) => c.no),
  ]);
  let no = 1;
  while (taken.has(no)) no += 1;
  return no;
}

/**
 * A blank draft that is deliberately *invalid*: the schema requires real
 * pedagogy (three anatomy steps, a flagged dangerous segment, a quiz answer
 * inside its options). Export stays locked until the editor fills it in, so a
 * half-written course can never be mistaken for a finished one.
 */
export function blankDraft(
  no: number,
  meta: Partial<CourseMeta> = {},
): CourseDraft {
  return {
    no,
    meta: {
      nama: meta.nama ?? "",
      level: meta.level ?? 1,
      ciri: meta.ciri ?? [""],
      laporan: meta.laporan ?? null,
      laporanNote: meta.laporanNote ?? null,
      kerugian: meta.kerugian ?? "",
    },
    content: {
      no,
      anatomi: [{ judul: "", teks: "" }],
      contohJudul: "",
      contohJenis: "pesan",
      contohSumber: "",
      contohIsi: [{ text: "", berbahaya: false }],
      checklist: [""],
      kuis: [
        {
          id: `q1`,
          prompt: "",
          options: [
            { id: "a", label: "" },
            { id: "b", label: "" },
          ],
          correctId: "",
          rationale: "",
        },
      ],
      lapor: [""],
      scenarioId: null,
    },
    updatedAt: new Date(0).toISOString(),
  };
}

/**
 * The parts of a Zod issue this file reads. Zod's default messages are English
 * and the field path is a machine path (`kuis.0.options.1.label`); neither is
 * usable feedback for someone filling a form, so both are translated here.
 */
type DraftIssue = {
  readonly code?: string;
  readonly path: readonly PropertyKey[];
  readonly message: string;
  readonly origin?: string;
  readonly minimum?: number | bigint;
  readonly maximum?: number | bigint;
};

/** Human name for a schema path, with the one-based position people see. */
function fieldLabel(path: readonly PropertyKey[]): string {
  const [head, ...rest] = path.map(String);
  const at = (index: number) => {
    const value = rest[index];
    return value !== undefined && /^\d+$/.test(value)
      ? Number(value) + 1
      : null;
  };

  switch (head) {
    case "nama":
      return "Nama course";
    case "level":
      return "Level";
    case "ciri": {
      const position = at(0);
      return position ? `Ciri ke-${position}` : "Ciri singkat";
    }
    case "laporan":
      return "Jumlah laporan";
    case "laporanNote":
      return "Catatan laporan";
    case "kerugian":
      return "Kerugian";
    case "no":
      return "Nomor course";
    case "anatomi": {
      const step = at(0);
      if (!step) return "Anatomi langkah";
      if (rest[1] === "judul") return `Anatomi langkah ${step} — judul`;
      if (rest[1] === "teks") return `Anatomi langkah ${step} — penjelasan`;
      return `Anatomi langkah ${step}`;
    }
    case "contohJudul":
      return "Judul contoh";
    case "contohJenis":
      return "Bentuk contoh";
    case "contohSumber":
      return "Baris sumber";
    case "contohIsi": {
      const segment = at(0);
      return segment ? `Segmen contoh ${segment}` : "Segmen contoh";
    }
    case "checklist": {
      const item = at(0);
      return item ? `Checklist ${item}` : "Checklist";
    }
    case "kuis": {
      const question = at(0);
      if (!question) return "Kuis";
      const part = rest[1];
      if (part === "prompt") return `Kuis ${question} — pertanyaan`;
      if (part === "rationale") return `Kuis ${question} — alasan`;
      if (part === "correctId") return `Kuis ${question} — jawaban benar`;
      if (part === "options") {
        const option = at(2);
        return option
          ? `Kuis ${question} — opsi ${option}`
          : `Kuis ${question} — opsi`;
      }
      return `Kuis ${question}`;
    }
    case "lapor": {
      const step = at(0);
      return step ? `Langkah lapor ${step}` : "Langkah lapor";
    }
    case "scenarioId":
      return "Skenario simulasi";
    default:
      return "Course";
  }
}

function issueText(issue: DraftIssue): string {
  const amount = Number(issue.minimum ?? issue.maximum ?? 0);
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string") return `minimal ${amount} karakter`;
      if (issue.origin === "array") return `minimal ${amount} item`;
      return `minimal ${amount}`;
    case "too_big":
      if (issue.origin === "string") return `maksimal ${amount} karakter`;
      if (issue.origin === "array") return `maksimal ${amount} item`;
      return `maksimal ${amount}`;
    case "invalid_type":
      return "wajib diisi";
    case "invalid_value":
      return "pilih salah satu nilai yang tersedia";
    default:
      return issue.message;
  }
}

function describeIssue(issue: DraftIssue): string {
  const text = issueText(issue).trim();
  return `${fieldLabel(issue.path)}: ${text}${text.endsWith(".") ? "" : "."}`;
}

/**
 * Every problem the export would reject, one per line, or null when the draft
 * can be exported. The first problem alone used to be shown, which made a new
 * course feel like it had an endless series of unrelated errors.
 */
export function validateDraft(draft: CourseDraft): string | null {
  const found: DraftIssue[] = [];

  const meta = CourseMetaSchema.safeParse(draft.meta);
  if (!meta.success) found.push(...meta.error.issues);

  const content = ModuleContentSchema.safeParse(draft.content);
  if (!content.success) found.push(...content.error.issues);

  if (found.length === 0) return null;

  const shown = found.slice(0, 8).map(describeIssue);
  const remaining = found.length - shown.length;
  if (remaining > 0) shown.push(`…dan ${remaining} masalah lain`);
  return shown.join("\n");
}

export function draftContent(draft: CourseDraft): ModuleContent {
  return draft.content;
}

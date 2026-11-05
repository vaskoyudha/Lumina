import {
  blankDraft,
  type CourseDraft,
  DRAFT_EVENT,
  loadDrafts,
  nextCourseNo,
  removeDraft,
  upsertDraft,
  validateDraft,
} from "@/lib/admin/draft-store";
import { exportCourse } from "@/lib/admin/export-course";

/** A minimal course that passes every rule in the schema. */
function filled(no = 13): CourseDraft {
  const draft = blankDraft(no, {
    nama: "Undian palsu",
    level: 2,
    ciri: ["Minta biaya admin"],
    laporan: 15477,
    kerugian: "±Rp189,9 M",
  });
  return {
    ...draft,
    content: {
      no,
      anatomi: [
        {
          judul: "Pesan menang",
          teks: "Kamu dinyatakan menang undian berhadiah besar.",
        },
        {
          judul: "Minta biaya",
          teks: "Pelaku meminta biaya admin sebelum hadiah dikirim.",
        },
        {
          judul: "Data dicuri",
          teks: "Nomor kartu dan OTP diambil dari percakapan itu.",
        },
      ],
      contohJudul: "Contoh pesan undian",
      contohJenis: "pesan",
      contohSumber: "Nomor tak dikenal · baru saja",
      contohIsi: [
        { text: "Selamat, Anda menang! ", berbahaya: false },
        { text: "Bayar biaya admin Rp2.500.000 dulu", berbahaya: true },
      ],
      checklist: [
        "Minta uang sebelum hadiah",
        "Nomor tak dikenal",
        "Desakan waktu",
      ],
      kuis: [
        {
          id: "q1",
          prompt: "Apa yang kamu lakukan setelah menerima pesan menang?",
          options: [
            { id: "a", label: "Bayar biaya admin" },
            { id: "b", label: "Abaikan dan laporkan" },
          ],
          correctId: "b",
          rationale: "Undian asli tidak pernah meminta biaya di muka.",
        },
        {
          id: "q2",
          prompt: "Apa yang kamu lakukan kalau diminta OTP?",
          options: [
            { id: "a", label: "Kirim OTP" },
            { id: "b", label: "Jangan pernah kirim OTP" },
          ],
          correctId: "b",
          rationale: "Bank tidak pernah meminta kode OTP lewat chat.",
        },
        {
          id: "q3",
          prompt: "Apa yang kamu lakukan kalau sudah transfer?",
          options: [
            { id: "a", label: "Hubungi bank lewat nomor resmi" },
            { id: "b", label: "Diamkan saja" },
          ],
          correctId: "a",
          rationale: "Blokir sementara lewat bank adalah langkah pertama.",
        },
      ],
      lapor: ["Hubungi bank", "Laporkan ke IASC"],
      scenarioId: null,
    },
  };
}

describe("admin draft store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("treats a blank draft as invalid, so a half-written course cannot be exported", () => {
    const draft = blankDraft(5);
    expect(validateDraft(draft)).not.toBeNull();
    // The blank draft still opens on the default shape — the editor must not
    // start on a value the schema would reject.
    expect(draft.content.contohJenis).toBe("pesan");
  });

  it("rejects a situs draft without an address line", () => {
    const draft = filled(13);
    draft.content.contohJenis = "situs";
    draft.content.contohSumber = " ";
    expect(validateDraft(draft)).toMatch(/sumber/i);

    draft.content.contohSumber = "https://pengiriman-palsu.example";
    expect(validateDraft(draft)).toBeNull();
  });

  it("accepts a complete draft, including numbers past twelve", () => {
    expect(validateDraft(filled(13))).toBeNull();
  });

  it("names the field that is too short instead of leaking the zod message", () => {
    // A blank draft starts with one empty ciri. The old validator printed
    // "Too small: expected string to have >=3 characters" and no field name.
    const draft = filled(13);
    draft.meta.ciri = ["", "Tautan aneh"];

    const error = validateDraft(draft);
    expect(error).toMatch(/Ciri ke-1/i);
    expect(error).toMatch(/minimal 3 karakter/i);
    expect(error).not.toMatch(/Too small/i);
  });

  it("lists every blocking problem in words a form can act on", () => {
    const draft = filled(13);
    draft.meta.nama = "";
    draft.content.contohJudul = "";

    const error = validateDraft(draft) ?? "";
    expect(error.split("\n").length).toBeGreaterThan(1);
    expect(error).toMatch(/Nama course: minimal 3 karakter/i);
    expect(error).toMatch(/Judul contoh: minimal 5 karakter/i);
  });

  it("persists drafts and re-reads them", () => {
    upsertDraft(filled(13));
    const store = loadDrafts();
    expect(store.courses).toHaveLength(1);
    expect(store.courses[0]?.no).toBe(13);
  });

  it("removes a draft permanently", () => {
    upsertDraft(filled(13));
    removeDraft(13);
    expect(loadDrafts().courses).toHaveLength(0);
  });

  it("falls back to empty on corrupt storage instead of throwing", () => {
    window.localStorage.setItem("lumina-admin-draft-v1", "{not json");
    expect(loadDrafts().courses).toEqual([]);
  });

  it("migrates a draft written before contohPesan was renamed", () => {
    // A draft created before the four-shape change still says contohPesan and
    // has no contohJenis/contohSumber. Reading it must not crash the editor at
    // `contohIsi.map`.
    const lama = filled(13);
    const contentLama: Record<string, unknown> = {
      ...lama.content,
      contohPesan: lama.content.contohIsi,
    };
    delete contentLama.contohIsi;
    delete contentLama.contohSumber;
    delete contentLama.contohJenis;

    window.localStorage.setItem(
      "lumina-admin-draft-v1",
      JSON.stringify({
        version: 1,
        courses: [
          { no: 13, meta: lama.meta, content: contentLama, updatedAt: "" },
        ],
      }),
    );

    const [course] = loadDrafts().courses;
    expect(course?.content.contohIsi).toHaveLength(2);
    expect(course?.content.contohJenis).toBe("pesan");
    expect(course?.content.contohSumber).toBe("");
    expect(course?.content).not.toHaveProperty("contohPesan");
    expect(validateDraft(course as CourseDraft)).toBeNull();
    // The crash was here: exportCourse called contohIsi.map on undefined.
    expect(exportCourse(course as CourseDraft).moduleFile).toContain(
      "contohIsi: [",
    );
  });

  it("picks the lowest unused course number", () => {
    upsertDraft(filled(13));
    expect(nextCourseNo([10])).toBe(1);
    upsertDraft(filled(1));
    expect(nextCourseNo([10])).toBe(2);
  });

  it("announces each write so sibling islands re-read", () => {
    const listener = jest.fn();
    window.addEventListener(DRAFT_EVENT, listener);
    upsertDraft(filled(13));
    window.removeEventListener(DRAFT_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

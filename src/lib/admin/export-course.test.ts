import { blankDraft, type CourseDraft } from "@/lib/admin/draft-store";
import { exportCourse, slugify } from "@/lib/admin/export-course";

function draft(no: number, nama: string): CourseDraft {
  const base = blankDraft(no, {
    nama,
    level: 3,
    ciri: ["a"],
    laporan: 1,
    kerugian: "±Rp1 M",
  });
  return {
    ...base,
    content: {
      ...base.content,
      anatomi: [
        {
          judul: "Satu",
          teks: "Penjelasan langkah pertama yang cukup panjang.",
        },
        { judul: "Dua", teks: "Penjelasan langkah kedua yang cukup panjang." },
        {
          judul: "Tiga",
          teks: "Penjelasan langkah ketiga yang cukup panjang.",
        },
      ],
      contohJudul: "Contoh pesan",
      contohJenis: "pesan",
      contohSumber: "Nomor tak dikenal · WhatsApp · baru saja",
      contohIsi: [{ text: "kirim OTP", berbahaya: true }],
      checklist: ["Satu", "Dua", "Tiga"],
      kuis: [
        {
          id: "q1",
          prompt: "Apa yang kamu lakukan sekarang?",
          options: [
            { id: "a", label: "Kirim" },
            { id: "b", label: "Tolak" },
          ],
          correctId: "b",
          rationale: "Jangan pernah mengirim kode OTP ke siapa pun.",
        },
      ],
      lapor: ["Lapor bank", "Lapor IASC"],
    },
  };
}

describe("export course", () => {
  it("produces the module file, the registry line and the catalog object", () => {
    const bundle = exportCourse(draft(13, "Undian palsu"));
    expect(bundle.fileName).toBe("modul-13.ts");
    expect(bundle.moduleFile).toContain("export const MODUL_13");
    expect(bundle.moduleFile).toContain("satisfies ModuleContent");
    expect(bundle.kurikulumEntry).toContain("13: MODUL_13");
    expect(bundle.modusEntry).toContain('"no": 13');
    expect(bundle.modusEntry).toContain('"nama": "Undian palsu"');
    expect(bundle.modusEntry).toContain('"modulStatus": "lengkap"');
    // The example's shape travels with the course — without it the exported
    // file would silently render every example as a chat bubble.
    expect(bundle.moduleFile).toContain('contohJenis: "pesan"');
    expect(bundle.moduleFile).toContain(
      'contohSumber: "Nomor tak dikenal · WhatsApp · baru saja"',
    );
    expect(bundle.moduleFile).toContain("contohIsi: [");
    expect(bundle.moduleFile).not.toContain("contohPesan");
  });

  it("exports a non-message shape with its source line", () => {
    const uji = draft(14, "Tautan palsu");
    uji.content.contohJenis = "tautan";
    uji.content.contohSumber = "Tautan dari link";
    const bundle = exportCourse(uji);

    expect(bundle.moduleFile).toContain('contohJenis: "tautan"');
    expect(bundle.moduleFile).toContain('contohSumber: "Tautan dari link"');
  });

  it("escapes quotes and comment terminators in generated source", () => {
    const uji = draft(13, 'Judul */ "palsu"');
    uji.content.checklist[0] = 'Cek "undangan.apk"';
    uji.content.lapor[0] = 'Jangan buka "file"';

    const bundle = exportCourse(uji);

    expect(bundle.moduleFile).toContain(String.raw`"Cek \"undangan.apk\""`);
    expect(bundle.moduleFile).toContain(String.raw`"Jangan buka \"file\""`);
    expect(bundle.moduleFile).toContain('Judul * / "palsu"');
    expect(bundle.moduleFile).not.toContain("Judul */");
  });

  it("exports the professional layer when the draft has it", () => {
    const uji = draft(15, "Musiman");
    uji.content.ringkasan =
      "Ringkasan singkat yang menjelaskan pola penipuan ini dengan jelas.";
    uji.content.tujuan = [
      "Mengenali tanda bahaya utama dari pola ini.",
      "Mengambil langkah aman sebelum uang berpindah.",
    ];
    uji.content.poinKunci = [
      "Jangan pernah membayar untuk menerima hadiah.",
      "Verifikasi lewat kanal resmi, bukan tautan di pesan.",
    ];
    uji.content.estimasiMenit = 7;

    const bundle = exportCourse(uji);

    expect(bundle.moduleFile).toContain("ringkasan:");
    expect(bundle.moduleFile).toContain("tujuan: [");
    expect(bundle.moduleFile).toContain("poinKunci: [");
    expect(bundle.moduleFile).toContain("estimasiMenit: 7");
  });

  it("does not invent the professional layer for an older draft", () => {
    const bundle = exportCourse(draft(16, "Lama"));
    expect(bundle.moduleFile).not.toContain("ringkasan:");
    expect(bundle.moduleFile).not.toContain("estimasiMenit:");
  });

  it("flags courses past the original twelve", () => {
    expect(exportCourse(draft(13, "Baru")).requiresUnboundedList).toBe(true);
    expect(exportCourse(draft(7, "Lama")).requiresUnboundedList).toBe(false);
  });

  it("never claims a simulation the draft does not have", () => {
    const bundle = exportCourse(draft(9, "Tanpa simulasi"));
    expect(bundle.moduleFile).toContain("scenarioId: null");
    expect(bundle.modusEntry).toContain('"scenarioId": null');
  });

  it("derives a stable slug from the course name", () => {
    expect(slugify("Undian & Hadiah Palsu", 5)).toBe("undian-hadiah-palsu");
    expect(slugify("", 42)).toBe("course-42");
  });
});

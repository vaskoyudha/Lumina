import { MODUL_10 } from "@/data/modul-10";
import { ModuleContentSchema } from "@/data/modul-schema";

/** A course that passes every rule, derived from the published module. */
function valid() {
  return JSON.parse(JSON.stringify(MODUL_10)) as typeof MODUL_10;
}

describe("modul schema — bentuk contoh", () => {
  it("accepts content written before contohJenis existed", () => {
    // Published modules and drafts already in localStorage predate the field.
    // Requiring it would strand every one of them behind a silent migration.
    const lama = valid() as Record<string, unknown>;
    delete lama.contohJenis;
    delete lama.contohSumber;
    expect(ModuleContentSchema.safeParse(lama).success).toBe(true);
  });

  it("accepts all four declared shapes", () => {
    for (const jenis of ["pesan", "tautan", "situs", "panggilan"] as const) {
      const uji = { ...valid(), contohJenis: jenis, contohSumber: "sumber" };
      expect(ModuleContentSchema.safeParse(uji).success).toBe(true);
    }
  });

  it("rejects a shape outside the four", () => {
    const uji = { ...valid(), contohJenis: "email" };
    expect(ModuleContentSchema.safeParse(uji).success).toBe(false);
  });

  it("requires a source line only for the situs shape", () => {
    // The address bar is the whole lesson of a fake-site example: without an
    // address there is nothing to distrust.
    const situs = { ...valid() } as Record<string, unknown>;
    situs.contohJenis = "situs";
    delete situs.contohSumber;
    expect(ModuleContentSchema.safeParse(situs).success).toBe(false);

    const situsAdaSumber = {
      ...situs,
      contohSumber: "https://pengiriman-palsu.example",
    };
    expect(ModuleContentSchema.safeParse(situsAdaSumber).success).toBe(true);

    // Other shapes carry a sensible default in the renderer.
    const pesan = { ...valid() } as Record<string, unknown>;
    delete pesan.contohSumber;
    expect(
      ModuleContentSchema.safeParse({ ...pesan, contohJenis: "pesan" }).success,
    ).toBe(true);
  });

  it("no longer accepts the old contohPesan key", () => {
    // Renaming is only honest if the old shape actually fails: a schema that
    // silently accepts both would let two field names drift apart.
    const { contohIsi: _isi, ...rest } = valid();
    const lama = { ...rest, contohPesan: [{ text: "x", berbahaya: true }] };
    expect(ModuleContentSchema.safeParse(lama).success).toBe(false);
  });
});

import { REPORT_CONTACTS } from "@/data/report-contacts";

describe("REPORT_CONTACTS", () => {
  it("covers the four channels the templates can name", () => {
    const ids = ["iasc", "komdigi", "patrolisiber", "cekrekening"] as const;
    for (const id of ids) {
      expect(REPORT_CONTACTS[id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("lists only https sources", () => {
    for (const contacts of Object.values(REPORT_CONTACTS)) {
      for (const contact of contacts) {
        expect(contact.source.startsWith("https://")).toBe(true);
      }
    }
  });

  it("normalises WhatsApp values to 62 and phone values to digits", () => {
    for (const contacts of Object.values(REPORT_CONTACTS)) {
      for (const contact of contacts) {
        if (contact.kind === "wa") {
          expect(contact.value).toMatch(/^62\d+$/);
        }
        if (contact.kind === "tel") {
          expect(contact.value).toMatch(/^\d+$/);
        }
      }
    }
  });
});

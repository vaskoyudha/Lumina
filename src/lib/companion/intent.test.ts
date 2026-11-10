import {
  conversationIntent,
  isIncidentNarrative,
  learningModulesFor,
  wantsJobSearch,
} from "@/lib/companion/intent";
import { isQuestionAbout } from "@/lib/companion/turn";
import { SCAM_CASES } from "@/lib/scoring/bench-cases";

describe("conversation intent before scoring", () => {
  it.each([
    "pas aku doowload game bajakan akun tokopedia aku ke hack dan aku kehilangan duit karena gopay aku connect ke tokped",
    "tp uang aku udh hilang. aku udh chat dari piha tokpednya tp akun aku malah hilang",
    "gw di hack ajg kok lowongan",
    "tapi aku di hax loh kamu bilang ga ada penipuan",
  ])("recognises a personal incident: %s", (text) => {
    expect(isIncidentNarrative(text)).toBe(true);
    expect(conversationIntent(text)).toBe("incident");
    expect(wantsJobSearch(text)).toBe(false);
  });

  it("recognises the user's request for a course", () => {
    expect(
      conversationIntent(
        "kasih solusi yg jelas dong, ada course yg berguna ga",
      ),
    ).toBe("learning");
    expect(
      learningModulesFor("ada course yg berguna ga", [
        "akun aku di hack setelah download game bajakan",
      ]),
    ).toEqual([10, 7]);
    expect(
      learningModulesFor("ada modul investasi?", ["akun aku di hack"]),
    ).toEqual([3]);
  });

  it.each([
    "Cek pesan ini: akun saya diretas, transfer ke rekening saya sekarang!",
    "Saya dapat pesan akun saya diretas, klik https://bca-verif.xyz",
    "akun saya belum pernah diretas",
  ])("does not guard evidence or a negated incident: %s", (text) => {
    expect(isIncidentNarrative(text)).toBe(false);
  });

  it("does not bypass checking for any benchmark scam", () => {
    expect(
      SCAM_CASES.filter(
        ({ text }) =>
          conversationIntent(text) !== null || isQuestionAbout(text),
      ).map(({ id }) => id),
    ).toEqual([]);
  });

  it("only authorises an explicit job search", () => {
    expect(wantsJobSearch("cari lowongan React remote")).toBe(true);
    expect(wantsJobSearch("ada course yg berguna ga")).toBe(false);
    expect(wantsJobSearch("jangan cari lowongan, akun saya diretas")).toBe(
      false,
    );
  });
});

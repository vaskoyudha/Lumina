import { explain } from "@/lib/companion/explain";
import { scoreText } from "@/lib/scoring/score";

const APK =
  "Selamat siang Bu, ini undangan pernikahan. Silakan instal undangan-nikah.apk. " +
  "Transfer biaya administrasi Rp150.000 ke rekening 1234567890 a.n. Budi.";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

const BENIGN = "Halo, apa kabar? Besok kita jadi makan siang?";

describe("explain", () => {
  it("names the tactics that actually fired", () => {
    const result = scoreText({ text: APK });
    const { tactics } = explain(result, APK);
    const ids = tactics.map((tactic) => tactic.id);

    expect(ids).toContain("rahasia"); // the .apk
    expect(ids).toContain("uang"); // the "biaya administrasi"
  });

  it("never invents a tactic the detectors did not find", () => {
    const result = scoreText({ text: BENIGN });
    const { tactics } = explain(result, BENIGN);
    expect(tactics).toEqual([]);
  });

  it("quotes the user's own words for a tactic", () => {
    const result = scoreText({ text: PHISH });
    const { tactics } = explain(result, PHISH);
    const tautan = tactics.find((tactic) => tactic.id === "tautan");
    expect(tautan?.evidence).toBeTruthy();
    expect(tautan?.evidence).toContain("bca-verif");
  });

  it("orders tactics the way the scheme walks them", () => {
    const result = scoreText({ text: PHISH });
    const ids = explain(result, PHISH).tactics.map((tactic) => tactic.id);
    // phishing-tautan is declared as otoritas -> tautan -> rahasia -> urgensi.
    const position = (id: string) => ids.indexOf(id as never);
    expect(position("otoritas")).toBeLessThan(position("tautan"));
    expect(position("tautan")).toBeLessThan(position("urgensi"));
  });

  it("ticks the anatomy steps this message performs and leaves the rest", () => {
    const result = scoreText({ text: PHISH });
    const { anatomy } = explain(result, PHISH);
    expect(anatomy.length).toBeGreaterThan(0);
    // Every step carries an explicit boolean; none is undefined.
    for (const step of anatomy) expect(typeof step.present).toBe("boolean");
  });

  it("gives verification steps the person can do themselves", () => {
    const result = scoreText({ text: PHISH });
    const { verify } = explain(result, PHISH);
    expect(verify.length).toBeGreaterThanOrEqual(2);
    for (const step of verify) {
      expect(step.do.length).toBeGreaterThan(10);
      expect(step.why.length).toBeGreaterThan(10);
    }
  });

  it("points at a real agency with a real URL", () => {
    const result = scoreText({ text: APK });
    const { report } = explain(result, APK);
    expect(report.length).toBeGreaterThan(0);
    for (const channel of report) {
      expect(channel.href).toMatch(/^https:\/\//);
      expect(channel.note.length).toBeGreaterThan(10);
    }
  });

  it("claims no agency when nothing was recognised", () => {
    // An unrecognised message has no scheme, so there is no specific channel to
    // point at. Sending someone to a fraud bureau for "apa kabar" is noise.
    const result = scoreText({ text: BENIGN });
    const { report, unrecognized } = explain(result, BENIGN);
    expect(unrecognized).toBe(true);
    expect(report).toEqual([]);
  });

  it("still gives generic verification for an unrecognised message", () => {
    const result = scoreText({ text: BENIGN });
    expect(explain(result, BENIGN).verify.length).toBeGreaterThan(0);
  });

  it("is deterministic: the same message explains the same way twice", () => {
    const first = explain(scoreText({ text: APK }), APK);
    const second = explain(scoreText({ text: APK }), APK);
    expect(first).toEqual(second);
  });
});

describe("report fallback for an unrecognized high-risk message", () => {
  const OTP_ONLY =
    "Kirim kode OTP 6 digit yang baru saja masuk ke nomor ini sekarang.";

  it("still gives OTP theft a channel to report to", () => {
    const result = scoreText({ text: OTP_ONLY });
    expect(result.risk).toBe("tinggi");
    expect(result.modus).toBe("tidak-dikenali");

    const { report } = explain(result, OTP_ONLY);
    expect(report.map((channel) => channel.id)).toEqual(["iasc", "komdigi"]);
  });

  it("does not invent a channel for a harmless unrecognized message", () => {
    const text = "Halo, besok kita rapat jam sembilan pagi.";
    const result = scoreText({ text });
    expect(result.modus).toBe("tidak-dikenali");
    expect(explain(result, text).report).toEqual([]);
  });
});

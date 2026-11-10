import {
  composeAnswerFallback,
  composeReply,
  isGreeting,
  suggestedActions,
} from "@/lib/companion/reply";
import type { ScoreResult } from "@/lib/contracts/score";
import { scoreText } from "@/lib/scoring/score";

const APK =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.";

describe("conversational fallback", () => {
  it("does not redirect a failed question to scam checking", () => {
    expect(composeAnswerFallback("tanya", "timeout")).toMatch(/terlalu lama/i);
    expect(composeAnswerFallback("tanya", "unconfigured")).toMatch(
      /belum dikonfigurasi/i,
    );
    expect(composeAnswerFallback("tanya")).not.toMatch(/tempel|penipuan/i);
  });

  it("gives useful incident guidance when the model is unavailable", () => {
    const reply = composeAnswerFallback("obrolan", "failed", {
      question: "akun aku di hack dan uang aku hilang",
      history: [],
    });
    expect(reply).toMatch(/pemulihan akun/i);
    expect(reply).toMatch(/transaksi yang tidak kamu lakukan/i);
    expect(reply).toMatch(/tidak dijamin/i);
    expect(reply).not.toMatch(/tidak ada pola penipuan|lowongan/i);
  });
});

describe("isGreeting", () => {
  it("recognises Indonesian openers", () => {
    expect(isGreeting("halo")).toBe(true);
    expect(isGreeting("Hai, apa kabar?")).toBe(true);
    expect(isGreeting("selamat pagi")).toBe(true);
  });

  it("does not treat a scam message opening with a greeting as small talk", () => {
    expect(isGreeting(APK)).toBe(false);
  });

  it("does not skip a short scam that opens with a greeting", () => {
    // Measured defect: `GREETING` was anchored only at the start and the guard
    // was `length < 40`. These four never reached the detectors, so the user
    // got the canned "Siap…" line for a real scam.
    const shortScams = [
      "Halo, ini dari BCA. Akun Anda diblokir.",
      "Hai, ini undangan pernikahan.apk",
      "Halo, selamat pagi. Anda menang undian.",
      "Hi, ada lowongan kerja online.",
    ];
    for (const text of shortScams) {
      expect(isGreeting(text)).toBe(false);
    }
  });

  it("still recognises a greeting followed by small talk", () => {
    expect(isGreeting("hi apa kabar")).toBe(true);
    expect(isGreeting("halo min")).toBe(true);
    expect(isGreeting("terima kasih")).toBe(true);
    expect(isGreeting("selamat malam")).toBe(true);
  });

  it("does not treat a normal sentence as a greeting", () => {
    expect(isGreeting("besok kita makan siang bareng ya")).toBe(false);
    expect(isGreeting("siapa kamu")).toBe(false);
  });
});

describe("composeReply", () => {
  it("never invents a score: it only reads the result it was given", () => {
    const result = scoreText({ text: APK });
    const reply = composeReply(APK, result, {
      first: false,
      containsContent: true,
    });
    expect(reply).toContain("berbahaya");
    // The reply must not restate a number the engine did not produce.
    expect(reply).not.toMatch(/\b\d{2}\/100\b/);
  });

  it("names the strongest finding in plain language", () => {
    const result = scoreText({ text: APK });
    const reply = composeReply(APK, result, {
      first: false,
      containsContent: true,
    });
    expect(reply.toLowerCase()).toContain("apk");
  });

  it("escalates to emergency language on a high-risk result", () => {
    const result = scoreText({ text: APK });
    const reply = composeReply(APK, result, {
      first: false,
      containsContent: true,
    });
    expect(reply.toLowerCase()).toContain("kanal resmi");
  });

  it("stays calm on clean input", () => {
    const text = "besok kita makan siang bareng ya";
    const result = scoreText({ text });
    const reply = composeReply(text, result, {
      first: false,
      containsContent: true,
    });
    expect(reply.toLowerCase()).not.toContain("mode darurat");
    expect(reply.toLowerCase()).toContain("tidak ada pola");
  });

  it("asks for content politely when there is nothing to analyse", () => {
    const reply = composeReply("ok", null, {
      first: false,
      containsContent: false,
    });
    expect(reply.length).toBeGreaterThan(0);
    expect(reply.toLowerCase()).not.toContain("berbahaya");
  });
});

describe("suggestedActions", () => {
  it("offers module + emergency for the APK case", () => {
    const result = scoreText({ text: APK });
    const actions = suggestedActions(result);
    expect(actions.some((a) => a.href === "/belajar/10")).toBe(true);
    expect(actions.some((a) => a.href === "/komunitas")).toBe(true);
  });

  it("offers the playable scenario because module 10 has one", () => {
    const result = scoreText({ text: APK });
    const actions = suggestedActions(result);
    expect(actions.some((a) => a.href === "/simulasi/L1-kurir-apk")).toBe(true);
  });

  it("returns nothing when there is no result", () => {
    expect(suggestedActions(null)).toEqual([]);
  });

  it("offers nothing when no detector produced a weighted signal", () => {
    // `relatedModule` is data, not proof. A card that says "nothing matched"
    // must not sit above a button inviting the reader to study the scheme it
    // just failed to match.
    const empty: ScoreResult = {
      score: 0,
      risk: "bersih",
      signals: [
        {
          label: "Tidak ada pola penipuan yang dikenali pada teks ini",
          weight: 0,
          evidence: "",
          agent: "scoring",
        },
      ],
      modus: "tidak-dikenali",
      advice: [],
      relatedModule: 10,
      hardOverride: false,
    };

    expect(suggestedActions(empty)).toEqual([]);
  });

  it("offers nothing on a clean engine result", () => {
    const result = scoreText({
      text: "Aku sudah transfer uang kas kelas kemarin sore, tolong dicatat ya.",
    });

    expect(result.relatedModule).toBeNull();
    expect(suggestedActions(result)).toEqual([]);
  });
});

describe("copy quality (5 Nov 2026)", () => {
  it("keeps the modus name's own capitalisation", () => {
    const reply = composeReply(APK, scoreText({ text: APK }), {
      first: false,
      containsContent: true,
    });

    // "File APK via WhatsApp" is a name from modus.json. Lowercasing it to
    // "file apk via whatsapp" reads as internal data leaking into the prose.
    expect(reply).toContain("File APK via WhatsApp");
    expect(reply).not.toContain("file apk via whatsapp");
  });

  it("does not promise a module when there is no module to link", () => {
    // `tidak-dikenali` means `relatedModule` is null, so `suggestedActions`
    // renders no button. The old sentence offered "lewat modul yang terkait"
    // and then showed nothing to click.
    const text = "Promo berakhir malam ini, segera pesan sebelum kehabisan.";
    const result = scoreText({ text });
    expect(result.relatedModule).toBeNull();

    const reply = composeReply(text, result, {
      first: false,
      containsContent: true,
    });
    const actions = suggestedActions(result);

    expect(reply).not.toMatch(/modul yang terkait/i);
    expect(actions.some((a) => a.href.startsWith("/belajar/"))).toBe(false);
  });

  it("still promises the module when one exists", () => {
    // Only the `mencurigakan` branch offers the module: at `tinggi` the reply
    // gives the emergency instruction instead, which is the right priority.
    const text =
      "Sayang, paketku tertahan di imigrasi. Kirim uang biaya bea masuknya ke rekening pribadi pak imigrasinya ya. Aku rindu, video call besok?";
    const result = scoreText({ text });
    expect(result.risk).toBe("mencurigakan");
    expect(result.relatedModule).not.toBeNull();

    const reply = composeReply(text, result, {
      first: false,
      containsContent: true,
    });

    expect(reply).toMatch(/modul yang terkait/i);
    expect(
      suggestedActions(result).some((a) => a.href.startsWith("/belajar/")),
    ).toBe(true);
  });

  it("never mangles an acronym into a lowercase first letter", () => {
    // Defensive: a future signal label may start with "APK".
    const reply = composeReply(APK, scoreText({ text: APK }), {
      first: false,
      containsContent: true,
    });

    expect(reply).not.toMatch(/\baPK\b/);
  });
});

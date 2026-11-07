import { explain } from "@/lib/companion/explain";
import {
  isQuestionAbout,
  PASTE_LENGTH,
  planTurn,
  SHORTEST_SCAM,
} from "@/lib/companion/turn";
import { LEGIT_CASES, SCAM_CASES } from "@/lib/scoring/bench-cases";
import { scoreText } from "@/lib/scoring/score";

const APK =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.";

describe("planTurn · lanes", () => {
  it("sends a message with findings to periksa", () => {
    const result = scoreText({ text: APK });
    const plan = planTurn({
      text: APK,
      result,
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("periksa");
    expect(plan.hasFindings).toBe(true);
  });

  it("sends a message with a link to periksa even when nothing scored", () => {
    const text = "coba buka https://contoh.test ya";
    const plan = planTurn({
      text,
      // The link rule happens to fire on this URL today, so the result is
      // emptied to prove the *branch* routes it, not the signal. This is the
      // case that matters: a link deserves the Link Agent row even at 0/100.
      result: { ...scoreText({ text }), signals: [] },
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("periksa");
    expect(plan.hasFindings).toBe(false);
  });

  it("checks a turn that is only an attachment", () => {
    const text = "tangkap layar.png";
    const plan = planTurn({
      text,
      result: scoreText({ text }),
      lastResult: null,
      lastExplanation: null,
      attachments: 1,
    });
    expect(plan.lane).toBe("periksa");
  });

  it("sends an ordinary sentence to obrolan, not to a 0/100 card", () => {
    const text = "besok kita makan siang bareng ya di kantin dekat gedung baru";
    const plan = planTurn({
      text,
      result: scoreText({ text }),
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("obrolan");
    expect(plan.hasFindings).toBe(false);
  });

  it("sends a greeting to obrolan", () => {
    const plan = planTurn({
      text: "hi apa kabar",
      result: scoreText({ text: "hi apa kabar" }),
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("obrolan");
  });

  it("sends a self-question to tanya", () => {
    const plan = planTurn({
      text: "siapa kamu",
      result: null,
      lastResult: null,
      lastExplanation: null,
    });
    expect(plan.lane).toBe("tanya");
  });

  it("keeps a guarded question in tanya even when it names a money word", () => {
    // Measured defect: "apa itu dana?" scores 0, but `MONEY` matches "dana",
    // so without the `asked` flag it routed to periksa — and because the
    // guard skipped scoring, `result` was null and the turn fell into the old
    // canned "belum menemukan apa pun" reply. A question the guard already
    // claimed must not be re-classified by a keyword inside it.
    expect(isQuestionAbout("apa itu dana?")).toBe(true);
    const plan = planTurn({
      text: "apa itu dana?",
      result: null,
      lastResult: null,
      lastExplanation: null,
      asked: true,
    });
    expect(plan.lane).toBe("tanya");
    expect(plan.hasFindings).toBe(false);
  });

  it("answers a follow-up from the previous verdict instead of re-checking", () => {
    const result = scoreText({ text: APK });
    const plan = planTurn({
      text: "kenapa berbahaya?",
      result: scoreText({ text: "kenapa berbahaya?" }),
      lastResult: result,
      lastExplanation: explain(result, APK),
    });
    expect(plan.lane).toBe("lanjutan");
  });
});

describe("planTurn · the recall invariant", () => {
  it("routes every bench scam to periksa", () => {
    const missed = SCAM_CASES.filter((benchCase) => {
      const plan = planTurn({
        text: benchCase.text,
        result: scoreText({ text: benchCase.text }),
        lastResult: null,
        lastExplanation: null,
      });
      return plan.lane !== "periksa";
    }).map((benchCase) => benchCase.id);

    expect(missed).toEqual([]);
  });

  it("never routes a plain sentence to a check", () => {
    // The engine's low-weight signals on LEGIT_CASES l01/l03/l21/l22/l23 are
    // real: a promo with a deadline genuinely shares a feature with a scam. So
    // the invariant is not "no findings on legitimate messages" — it is "no
    // card for a message the user is simply saying". A sentence with no
    // findings, link, phone, attachment, money word, or paste length stays in
    // a chat lane.
    const plain = [
      "besok kita makan siang bareng ya di kantin dekat gedung baru",
      "hi apa kabar",
      "terima kasih banyak ya",
      "aku baru pulang dari kampus",
    ];

    const routed = plain.filter((text) => {
      const plan = planTurn({
        text,
        result: scoreText({ text }),
        lastResult: null,
        lastExplanation: null,
      });
      return plan.lane === "periksa";
    });

    expect(routed).toEqual([]);
  });

  it("checks a legitimate message whenever the engine found a signal in it", () => {
    // Not a false-positive gate — the score gate owns that. It is the routing
    // contract: if the engine produced a weighted signal, the card must show,
    // even when the verdict is "rendah". l01 is a real OTP, and it is checked,
    // not hidden.
    const missed = LEGIT_CASES.filter((benchCase) => {
      const result = scoreText({ text: benchCase.text });
      if (!result.signals.some((signal) => signal.weight > 0)) return false;
      return (
        planTurn({
          text: benchCase.text,
          result,
          lastResult: null,
          lastExplanation: null,
        }).lane !== "periksa"
      );
    }).map((benchCase) => benchCase.id);

    expect(missed).toEqual([]);
  });
});

describe("isQuestionAbout · narrow on purpose", () => {
  it("guards a question about a scam family", () => {
    expect(isQuestionAbout("apa itu pinjol?")).toBe(true);
    expect(isQuestionAbout("jelaskan apa itu phising")).toBe(true);
    expect(isQuestionAbout("siapa kamu")).toBe(true);
    expect(isQuestionAbout("kamu siapa?")).toBe(true);
  });

  it("never guards a message someone received", () => {
    expect(isQuestionAbout("Halo, ini dari BCA. Akun Anda diblokir.")).toBe(
      false,
    );
    expect(isQuestionAbout("Halo, ini dari BCA. Akun Anda diblokir?")).toBe(
      false,
    );
  });

  it("never guards a message that carries an artifact", () => {
    expect(isQuestionAbout("apa itu link https://bca-verif.xyz ?")).toBe(false);
    expect(isQuestionAbout("apa itu file undangan.apk?")).toBe(false);
  });

  it("leaves a follow-up to the lanjutan lane", () => {
    expect(
      isQuestionAbout("kenapa berbahaya?", { hasPriorVerdict: true }),
    ).toBe(false);
  });
});

describe("isQuestionAbout · payment words do not turn a question into a check", () => {
  it("guards a question about paying safely", () => {
    // Measured defect: "Bagaimana cara bayar pakai QRIS yang aman?" hit the
    // quishing rule at 0.7 and showed 70/tinggi about the person asking.
    expect(isQuestionAbout("Bagaimana cara bayar pakai QRIS yang aman?")).toBe(
      true,
    );
  });

  it("still checks a QRIS sticker that asks the reader to pay", () => {
    const text =
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).";
    expect(isQuestionAbout(text)).toBe(false);
    expect(
      planTurn({
        text,
        result: scoreText({ text }),
        lastResult: null,
        lastExplanation: null,
      }).lane,
    ).toBe("periksa");
  });
});

describe("turn · pinned lengths", () => {
  it("keeps the pasted-message threshold above every bench scam", () => {
    // If a future bench case is shorter than SHORTEST_SCAM the constant is a
    // lie. Length is only a safety net, but the net must not have holes.
    const shortest = Math.min(...SCAM_CASES.map((c) => c.text.length));
    expect(shortest).toBe(SHORTEST_SCAM);
    expect(PASTE_LENGTH).toBeGreaterThan(SHORTEST_SCAM);
  });
});

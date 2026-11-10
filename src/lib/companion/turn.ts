import type { Explanation } from "@/lib/companion/explain";
import type { ConversationIntent } from "@/lib/companion/intent";
import { isGreeting } from "@/lib/companion/reply";
import type { ScoreResult } from "@/lib/contracts/score";
import { extractLinks } from "@/lib/scoring/link";

/**
 * Lane routing — deterministic, pure, no network.
 *
 * The router decides whether the engine ran, so it cannot be a model call: a
 * model that routes "Halo, ini dari BCA" to small talk makes recall a property
 * of the network. It is also why the verdict stays instant — it was computed
 * in about a millisecond before this function was called.
 */

export type Lane = "periksa" | "tanya" | "lanjutan" | "obrolan" | "belajar";

export interface TurnPlan {
  lane: Lane;
  /** True when the engine produced at least one weighted signal. */
  hasFindings: boolean;
  /** Rendered as the lane note; also the reason a reviewer can check. */
  why: string;
}

/**
 * Above this, the text is a paste rather than a sentence.
 *
 * Measured: the shortest bench scam is 84 characters, the shortest bench legit
 * case is 57. A length test near 57 therefore cannot separate the two, so 160
 * is used instead — safely above every scam, and still a real "this is a
 * pasted paragraph" signal. Anything shorter that is genuinely a check is
 * caught by the findings, link, phone, attachment, or money test above this
 * line.
 */
export const PASTE_LENGTH = 160;

/** Shortest scam in the bench corpus (24). `turn.test.ts` pins it. */
export const SHORTEST_SCAM = 24;

const MONEY =
  /(transfer|rekening|bayar|pembayaran|top\s?up|dana|ovo|gopay|shopeepay|pulsa|qris|nominal|saldo)/i;

const PHONE = /(?:\+62|62|0)8\d{7,12}/;

const ATTACHMENT = /\b[\w-]+\.(apk|pdf)\b/i;

const FOLLOW_UP =
  /^(kenapa|mengapa|kok|maksudnya|jelaskan|terus|lalu|kalau begitu|bagaimana kalau|apa yang harus|apa yang bisa|gimana)\b/i;

/**
 * Shapes that ask about a concept rather than report a message.
 *
 * Every entry is an opener. "Halo, ini dari BCA. Akun Anda diblokir?" ends in
 * a question mark and must still be scored, which is why a trailing `?` alone
 * is not enough to make something a concept question.
 */
const CONCEPT_QUESTION: readonly RegExp[] = [
  /^(apa|apakah)\s+(itu|sih|yang\s+dimaksud|arti|artinya|beda|bedanya|perbedaan|fungsi|kegunaan|tujuan|isi)\b/i,
  /^(jelaskan|maksudnya|artinya)\b/i,
  /^(bagaimana|gimana)\s+(cara\s+)?(mengenali|menghindari|menangani|melapor|memeriksa|kerja|bekerja|membedakan|bayar|membayar|pakai|memakai)\b/i,
  /^(bagaimana|gimana)\b/i,
  /^(apa|apakah)\s+(yang|saya|aku|kamu|bisa|boleh|perlu|harus)\b/i,
  /^(bisa(?:kah)?|boleh(?:kah)?)\s+(?:(?:kamu|tolong)\s+)?(bantu|jelaskan|jelasin|tanya)\b/i,
  /^(aku|saya)\s+(mau|ingin|boleh)\s+(tanya|bertanya)\b/i,
  /^(kenapa|mengapa|kok)\b/i,
  /^(berapa|kapan|di\s?mana)\b/i,
  /^(siapa|apa)\s+(kamu|ini|lumina)\b/i,
  /^(kamu|ini)\s+(siapa|apa|bisa)\b/i,
  /^(apa\s+saja|contoh|contohnya)\b/i,
];

/** A request to explain content is different from a request to check safety. */
export function isContentQuestion(text: string): boolean {
  const t = normalized(text);
  if (
    /\b(cek|periksa|aman|berbahaya|penipuan|scam|phishing|virus|malware)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  return [
    /^(ini|itu)\s+(apa|isi(?:nya|\s+nya)?(?:\s+(?:kode|file|berkas|dokumen|gambar)(?:nya|\s+nya)?)?\s+apa|(?:kode|file|berkas|dokumen|gambar)(?:nya|\s+nya)?\s+apa)(?:\s+(?:ya|sih))?[?!.]*$/i,
    /^(apa|gimana|bagaimana)\s+(isi|maksud|arti|fungsi)(?:nya)?\b/i,
    /^(?:(?:tolong|coba|bisa(?:kah)?|boleh(?:kah)?)\s+)*(?:kamu\s+)?(jelaskan|jelasin|ringkas|rangkum|bacakan|baca)\b/i,
    /^(?:apa|apa\s+isi|isi|maksud|arti)(?:nya)?\s+(?:dari\s+)?(?:gambar|foto|ss|screenshot|berkas|file|dokumen|lampiran|tautan|link)\b/i,
    /^(?:gambar|foto|ss|screenshot|berkas|file|dokumen|lampiran|tautan|link)\s+(?:ini|itu)\s+(?:apa|isinya|maksudnya|berisi)\b/i,
    /^(?:baca(?:kan)?|jelaskan|rangkum|ringkas|terjemahkan)\b.{0,50}\b(?:gambar|foto|berkas|file|dokumen|lampiran|tautan|link)\b/i,
  ].some((pattern) => pattern.test(t));
}

/**
 * The attachment nouns and the markers that point back at one already sent.
 *
 * A follow-up like "the screenshot I just gave you" is a content question about
 * an earlier turn, not a new file. The client keeps the local transcription and
 * replays it only when this returns true; an ordinary sentence cannot pull a
 * checked screenshot back into the conversation.
 */
const ATTACHMENT_NOUN =
  /\b(?:screenshot|screen\s?shot|ss|image|photo|picture|attachment|file|document|tangkapan\s+layar|gambar|foto|lampiran|berkas|dokumen)\b/i;

const PRIOR_REFERENCE =
  /\b(?:tadi|barusan|sebelumnya|sebelum\s+ini|di\s+atas|above|earlier|previous(?:ly)?|before|(?:saya|aku)\s+(?:baru\s+)?(?:kirim|kasih|beri|unggah|tempel|bagikan)|(?:just|baru)\s+(?:sent|send|gave|give|shared|share|uploaded|upload|pasted|paste|attached|attach|showed|show))\b/i;

/** True when the reader is asking about an attachment sent on an earlier turn. */
export function refersToPriorAttachment(text: string): boolean {
  const t = normalized(text);
  if (t.length === 0) return false;
  if (!ATTACHMENT_NOUN.test(t) || !PRIOR_REFERENCE.test(t)) return false;
  // A URL, phone, or `.apk` name means this is new evidence, not a callback.
  if (MESSAGE_ARTIFACT.test(t)) return false;
  return !wantsSafetyCheck(t);
}

/**
 * A report *request*, not a question about reports.
 *
 * The old regex was `buat|bikin|susun … laporan`, which offered the tool for
 * "bagaimana cara buat laporan?" and "jangan buat laporan dulu". The guard is
 * intentionally narrow: an explicit request verb, a report noun, and no
 * negation, learning, or how-to framing.
 */
export function wantsReportDraft(text: string): boolean {
  const t = normalized(text);
  if (
    /\b(jangan|bukan|nggak|gak|ga|tidak|belum)\b.{0,35}\b(laporan|template)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/\b(belajar|cara|tutorial|panduan|contoh)\b/i.test(t)) return false;
  if (isQuestionAbout(t)) return false;
  return /\b(?:buat(?:kan)?|bikin(?:kan)?|susun(?:kan)?|membuat|menyusun)\b.{0,50}\b(laporan|template)\b/i.test(
    t,
  );
}

/** Explicit safety-check wording, used to separate a check from a content ask. */
export function wantsSafetyCheck(text: string): boolean {
  const t = normalized(text);
  return (
    /\b(?:cek|periksa|analisis|analisa)\b/i.test(t) ||
    /\b(?:aman|berbahaya|penipuan|scam|phishing|virus|malware)\b/i.test(t)
  );
}

/** Things only a received message carries. Their presence blocks the guard. */
const MESSAGE_ARTIFACT =
  /(https?:\/\/|www\.|\b[\w-]+\.(apk|pdf)\b|(?:\+62|62|0)8\d{7,12})/i;

function normalized(text: string): string {
  return text.trim().toLowerCase();
}

/** Follow-up questions are not new evidence for the Conversation Agent. */
export function isFollowUpQuestion(text: string): boolean {
  const t = normalized(text);
  return (
    FOLLOW_UP.test(t) &&
    !MESSAGE_ARTIFACT.test(t) &&
    !/\b(cek|periksa)\b/i.test(t)
  );
}

/** Question-shaped: ends in `?`, or opens like a concept question. */
export function isQuestionShape(text: string): boolean {
  const t = normalized(text);
  if (t.length === 0) return false;
  return t.endsWith("?") || CONCEPT_QUESTION.some((pattern) => pattern.test(t));
}

/**
 * A request to look something up on the web.
 *
 * Lumina has no browsing tool, so this is routed to the chat lane and answered
 * honestly instead of being scored as a received message. The guard rejects
 * anything that carries a message artifact, because a pasted scam can mention
 * "berita terbaru" too.
 */
export function isWebLookupQuestion(text: string): boolean {
  const t = normalized(text);
  if (t.length === 0 || MESSAGE_ARTIFACT.test(t)) return false;
  return (
    /\b(?:cari|carikan|search|telusuri|googling|browsing)\b.{0,40}\b(?:di|ke|lewat|pakai|pada)?\s*(?:web|internet|google|berita|sumber|online)\b/i.test(
      t,
    ) ||
    /\b(?:berita|informasi|kabar)\b.{0,30}\b(?:terbaru|terkini|hari ini)\b/i.test(
      t,
    )
  );
}

/**
 * True when the text is a question *about* scams, not a message that uses one.
 *
 * The guard runs before `scoreWithTrace`, so "apa itu pinjol?" is never scored
 * and cannot produce a 70/100 red card about the person asking. It is narrow on
 * purpose: a concept opener, at most two sentences, and no URL, phone number,
 * or `.apk`/`.pdf` name. A message someone received has none of those shapes.
 */
export function isQuestionAbout(
  text: string,
  options: { hasPriorVerdict?: boolean } = {},
): boolean {
  const t = normalized(text);
  if (t.length === 0) return false;
  if (MESSAGE_ARTIFACT.test(t)) return false;

  // "kenapa berbahaya?" belongs to the lane that already has the explanation.
  if (options.hasPriorVerdict && FOLLOW_UP.test(t)) return false;

  if (
    !CONCEPT_QUESTION.some((pattern) => pattern.test(t)) &&
    !isContentQuestion(t)
  )
    return false;

  const sentences = t.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return sentences.length <= 2;
}

/**
 * Pick the lane. First match wins.
 *
 * Order is load-bearing. Links, phones and attachments come before `lanjutan`
 * so a follow-up that carries new evidence is still checked. `lanjutan` comes
 * before money and length so "kenapa harus transfer?" is answered from the
 * explanation rather than re-scored to 0/100.
 */
export function planTurn(input: {
  text: string;
  result: ScoreResult | null;
  lastResult: ScoreResult | null;
  lastExplanation: Explanation | null;
  /**
   * The question guard already claimed this turn (`isQuestionAbout`). It is a
   * separate input on purpose: the guard runs before scoring, and a keyword
   * inside the question (`"apa itu dana?"`) must not re-route it to a check.
   */
  asked?: boolean;
  intent?: ConversationIntent | null;
  /**
   * How many files were attached. An attachment-only turn has no question text
   * to send, and its filename is what the engine reads, so it is a check.
   */
  attachments?: number;
}): TurnPlan {
  const text = input.text.trim();

  if (input.intent) {
    return {
      lane: input.intent === "learning" ? "tanya" : "obrolan",
      hasFindings: false,
      why: "Pengguna bercerita atau meminta bantuan, bukan menyerahkan pesan untuk diperiksa.",
    };
  }

  if (input.asked) {
    return {
      lane: "tanya",
      hasFindings: false,
      why: "Pertanyaan, bukan pesan yang diterima.",
    };
  }

  const hasFindings =
    input.result?.signals.some((signal) => signal.weight > 0) ?? false;

  if (hasFindings) {
    return { lane: "periksa", hasFindings, why: "Mesin menemukan sinyal." };
  }

  if (extractLinks(text).length > 0) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Ada tautan yang perlu diperiksa.",
    };
  }

  if (
    (input.attachments ?? 0) > 0 ||
    PHONE.test(text) ||
    ATTACHMENT.test(text)
  ) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Ada lampiran, nomor, atau nama berkas.",
    };
  }

  if (input.lastResult && FOLLOW_UP.test(text)) {
    return {
      lane: "lanjutan",
      hasFindings,
      why: "Lanjutan dari pemeriksaan sebelumnya.",
    };
  }

  if (MONEY.test(text)) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Isinya soal transaksi.",
    };
  }

  if (text.length >= PASTE_LENGTH) {
    return {
      lane: "periksa",
      hasFindings,
      why: "Panjangnya seperti pesan yang ditempel.",
    };
  }

  if (isQuestionShape(text)) {
    return {
      lane: "tanya",
      hasFindings,
      why: "Pertanyaan, bukan pesan yang diterima.",
    };
  }

  if (isGreeting(text)) {
    return { lane: "obrolan", hasFindings, why: "Sapaan." };
  }

  return {
    lane: "obrolan",
    hasFindings,
    why: "Tidak ada yang bisa diperiksa.",
  };
}

/** The user's conversational intent, never a risk verdict or a model label. */
export type ConversationIntent = "incident" | "learning" | "jobs";

const ARTIFACT =
  /(https?:\/\/|www\.|\b[\w-]+\.(apk|pdf)\b|(?:\+62|62|0)8\d{7,12})/i;
const CHECK_REQUEST =
  /\b(cek|periksa|analisis|analisa)\b|\b(ini|itu)\s+(penipuan|scam)\b/i;
const RECEIVED_MESSAGE =
  /["“”]|\b(isi pesan|pesannya|berbunyi|katanya)\b|\b(terima|dapat|dikirimi)\s+(pesan|sms|chat)\b/i;
const SELF = /\b(aku|saya|gw|gue|gua|sy)\b/i;
const COMPROMISE =
  /\b(?:di\s*)?(?:hack|hax|retas|bajak|bobol)\b|\b(diambil alih|ketipu|tertipu)\b/i;
const LOSS = /\b(kehilangan|hilang|dicuri|terkuras)\b/i;
const ACCOUNT_OR_MONEY =
  /\b(akun|uang|duit|saldo|rekening|email|gopay|tokopedia|tokped|ovo|dana)\b/i;

export function isIncidentNarrative(text: string): boolean {
  return (
    !ARTIFACT.test(text) &&
    !CHECK_REQUEST.test(text) &&
    !RECEIVED_MESSAGE.test(text) &&
    SELF.test(text) &&
    (COMPROMISE.test(text) ||
      (LOSS.test(text) && ACCOUNT_OR_MONEY.test(text))) &&
    !/\b(?:tidak|nggak|gak|ga|belum)\s+(?:pernah\s+)?(?:di\s*)?(?:hack|hax|retas|bajak|kehilangan|ketipu|tertipu)\b/i.test(
      text,
    )
  );
}

export function wantsLearning(text: string): boolean {
  return (
    !ARTIFACT.test(text) &&
    !CHECK_REQUEST.test(text) &&
    /\b(course|kursus|modul|materi|belajar)\b/i.test(text) &&
    /\b(ada|apa|mana|mau|ingin|pengen|butuh|cari|rekomendasi|kasih|bantu|belajar)\b/i.test(
      text,
    )
  );
}

/** Mentioning jobs in a complaint is not permission to run a job search. */
export function wantsJobSearch(text: string): boolean {
  return (
    !/\b(jangan|bukan|nggak|gak|ga|tidak|kok|malah)\b.{0,35}\b(lowongan|loker|kerja|pekerjaan|jobs?)\b/i.test(
      text,
    ) &&
    !isIncidentNarrative(text) &&
    /\b(cari(?:kan)?|temukan|mau|ingin|butuh|rekomendasi(?:kan)?)\b.{0,60}\b(lowongan|loker|kerja|pekerjaan|jobs?)\b/i.test(
      text,
    )
  );
}

export function conversationIntent(text: string): ConversationIntent | null {
  if (isIncidentNarrative(text)) return "incident";
  if (wantsLearning(text)) return "learning";
  if (
    wantsJobSearch(text) &&
    !ARTIFACT.test(text) &&
    !CHECK_REQUEST.test(text)
  ) {
    return "jobs";
  }
  return null;
}

/** Public module numbers only; this never creates or changes scoring signals. */
export function learningModulesFor(
  question: string,
  history: string[],
): number[] {
  const topic =
    /\b(investasi|kripto|pinjol|qris|lowongan|apk|game|download|unduh|hack|hax|retas|akun)\b/i;
  const context = topic.test(question)
    ? question
    : (history.findLast((text) => topic.test(text)) ?? question);
  if (/investasi|kripto/i.test(context)) return [3];
  if (/pinjol/i.test(context)) return [9];
  if (/qris/i.test(context)) return [11];
  if (/lowongan/i.test(context)) return [4];
  if (/apk|game|download|unduh/i.test(context)) return [10, 7];
  if (/hack|hax|retas|akun/i.test(context)) return [7, 10];
  return [];
}

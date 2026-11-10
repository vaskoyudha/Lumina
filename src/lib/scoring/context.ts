const WARNING =
  /\b(?:waspada\s+(?:terhadap\s+)?penipuan|hati.hati\s+(?:dengan\s+)?(?:penipuan|pesan)|contoh\s+(?:pesan\s+)?(?:penipuan|injeksi|scam)|artikel\s+(?:keamanan|edukasi)|berita\s+(?:tentang\s+)?penipuan|jangan\s+(?:pernah\s+)?(?:berikan|bagikan|kirim|bayar|transfer|buka|instal)|tidak\s+pernah\s+meminta)\b/i;

/** Warnings suppress the matching occurrence, never a later imperative. */
export function isQuotedWarning(
  text: string,
  start: number,
  length: number,
): boolean {
  const before = text.slice(0, start);
  /*
   * A phrase inside quotation marks is a citation, not an instruction. When the
   * paragraph around it also warns the reader, the quotation is what the rule
   * matched — an article or a warning that names a scam must not be scored as
   * the scam. The quote check comes first because the sentence boundary that
   * follows a "Waspada penipuan!" would otherwise hide the warning.
   */
  const wrapped =
    /['"“”‘’]/.test(text[start - 1] ?? "") &&
    /['"“”‘’]/.test(text[start + length] ?? "");
  if (wrapped) {
    const nearby = before.slice(-200) + text.slice(start, start + length);
    if (WARNING.test(nearby)) return true;
  }
  const boundary = Math.max(
    before.lastIndexOf("\n"),
    before.lastIndexOf("!"),
    before.lastIndexOf("?"),
    before.lastIndexOf(". "),
  );
  const prefix = before.slice(Math.max(boundary + 1, start - 140));
  const contrast = [
    ...prefix.matchAll(/\b(?:tetapi|tapi|namun|melainkan)\b/gi),
  ].at(-1);
  const local = contrast
    ? prefix.slice(contrast.index + contrast[0].length)
    : prefix;
  const segment = local + text.slice(start, start + length);
  return WARNING.test(segment);
}

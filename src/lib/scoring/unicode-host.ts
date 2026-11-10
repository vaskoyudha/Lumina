/** RFC 3492 decoder, kept browser-safe (no node:url dependency in the engine). */
export function unicodeHost(host: string): string {
  return host
    .split(".")
    .map((label) => {
      if (!label.startsWith("xn--")) return label;
      try {
        const input = label.slice(4);
        const split = input.lastIndexOf("-");
        const output =
          split < 0
            ? []
            : [...input.slice(0, split)].map((c) => c.codePointAt(0) ?? 0);
        let n = 128,
          i = 0,
          bias = 72,
          index = split < 0 ? 0 : split + 1;
        const adapt = (delta: number, points: number, first: boolean) => {
          delta = first ? Math.floor(delta / 700) : delta >> 1;
          delta += Math.floor(delta / points);
          let k = 0;
          while (delta > 455) {
            delta = Math.floor(delta / 35);
            k += 36;
          }
          return k + Math.floor((36 * delta) / (delta + 38));
        };
        while (index < input.length) {
          const old = i;
          let weight = 1;
          for (let k = 36; ; k += 36) {
            const code = input.charCodeAt(index++);
            const digit =
              code >= 48 && code <= 57
                ? code - 22
                : code >= 65 && code <= 90
                  ? code - 65
                  : code >= 97 && code <= 122
                    ? code - 97
                    : 36;
            if (digit >= 36 || !Number.isSafeInteger(weight))
              throw new Error("punycode");
            i += digit * weight;
            const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
            if (digit < t) break;
            weight *= 36 - t;
          }
          const length = output.length + 1;
          bias = adapt(i - old, length, old === 0);
          n += Math.floor(i / length);
          i %= length;
          if (n > 0x10ffff) throw new Error("punycode");
          output.splice(i++, 0, n);
        }
        if (!output.length) return label;
        return String.fromCodePoint(...output);
      } catch {
        return label;
      }
    })
    .join(".");
}
const CONFUSABLES: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  і: "i",
  ӏ: "l",
  ο: "o",
  ρ: "p",
  α: "a",
  υ: "u",
  х: "x",
  у: "y",
  к: "k",
};
export function hostSkeleton(host: string): string {
  return unicodeHost(host)
    .toLowerCase()
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/[аеорсіӏοραυχук]/gu, (c) => CONFUSABLES[c] ?? c);
}
export function mixedScripts(host: string): boolean {
  return host
    .split(".")
    .some(
      (label) =>
        /[a-z]/i.test(label) &&
        /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(label),
    );
}

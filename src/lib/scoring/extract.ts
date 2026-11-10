import type { Signal } from "@/lib/contracts/score";
import { extractLinks } from "@/lib/scoring/link";
export interface ExtractedEntities {
  sender?: string;
  amount?: { value: number; currency: "IDR" };
  account?: string;
  phone?: string;
  url?: string;
  timestamp?: string;
  confidence: number;
}
export function extractEntities(text: string): ExtractedEntities {
  const amount = /\bRp\s*([\dOoIl]+(?:[.,][\dOoIl]{3})*(?:,\d{2})?)/i.exec(
    text,
  );
  const digits = amount?.[1]
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/\./g, "")
    .replace(/,([0-9]{2})$/, ".$1")
    .replace(/,/g, "");
  const account =
    /\b(?:no\.?\s*)?(?:rekening|rek\.?|account)\s*[:=-]?\s*(\d[\d -]{5,28}\d)/i
      .exec(text)?.[1]
      ?.trim();
  const phone = /(?:\+62|0)8[\d -]{7,14}\d/.exec(text)?.[0];
  const sender = /^(?:pengirim|sender|dari)\s*[:=-]\s*([^\r\n]{2,80})/im.exec(
    text,
  )?.[1];
  const timestamp =
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4})(?:[^\r\n]{0,15}\d{1,2}:\d{2})?/i.exec(
      text,
    )?.[0];
  const url = extractLinks(text)[0];
  const value = digits ? Number(digits) : NaN;
  const amountValue =
    Number.isFinite(value) && value >= 0
      ? { value, currency: "IDR" as const }
      : undefined;
  const confidence = Number(
    (
      Number(!!account) * 0.3 +
      Number(!!amountValue) * 0.3 +
      Number(!!phone) * 0.1 +
      Number(!!sender) * 0.1 +
      Number(!!timestamp) * 0.1 +
      Number(!!url) * 0.1
    ).toFixed(2),
  );
  return {
    ...(sender ? { sender } : {}),
    ...(amountValue ? { amount: amountValue } : {}),
    ...(account ? { account } : {}),
    ...(phone ? { phone } : {}),
    ...(url ? { url } : {}),
    ...(timestamp ? { timestamp } : {}),
    confidence,
  };
}
export function extractedSignals(text: string): Signal[] {
  const entities = extractEntities(text);
  return entities.account && entities.amount && entities.confidence >= 0.6
    ? [
        {
          label:
            "Nominal dan rekening muncul bersamaan; cocokkan dengan bukti asli",
          weight: 0.2,
          evidence: entities.account,
          agent: "evidence",
          mechanism: "payment-redirect",
          ruleId: "evidence.amount-account",
        },
      ]
    : [];
}

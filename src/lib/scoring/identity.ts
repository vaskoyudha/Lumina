import type { Signal } from "@/lib/contracts/score";
import { OFFICIAL } from "@/lib/scoring/link";
import { annotateSignal } from "@/lib/scoring/mechanism";

/**
 * Identity Agent — the sender, not the message.
 *
 * Everything here is offline. SPF/DKIM/DMARC needs mail headers a pasted
 * WhatsApp screenshot never carries, so this agent does not pretend to check
 * them; it checks what a pasted message genuinely contains — a number, and a
 * claim about who sent it.
 *
 * The gate for every rule is the same: a *claim* adjacent to a number. A
 * message that merely mentions BCA ("transaksi di Indomaret") must stay silent,
 * or every legitimate bank notification becomes a false positive.
 *
 * Labels never embed digits from the message. `label` is part of the payload
 * that may leave the device; `evidence` is not. Keeping numbers out of labels
 * makes that a property of the whole digest rather than of one dropped field.
 */

/** Indonesian mobile, with optional separators: 0812-3456-7890, +62 812 … */
const MOBILE_ID = /(?:\+?62|0)8[\d\s-]{6,13}\d/g;

/** Any explicitly international number. */
const FOREIGN = /\+(\d{1,3})[\d\s-]{6,13}\d/g;

/** A sender introduced as digits: "Pengirim: 8888", "dari nomor 12345". */
const SHORTCODE =
  /(?:pengirim|sender|dari\s+nomor|nomor)\s*[:=]?\s*(\d{4,6})\b/i;

const FORWARD =
  /\b(?:diteruskan(?:\s+banyak\s+kali)?|forwarded(?:\s+many\s+times)?)\b/i;

/**
 * "saya dari BCA", "ini dari pihak BRI", "kami dari Mandiri", "CS BCA",
 * "BCA resmi". A bare brand mention is not a claim, and `OFFICIAL` includes
 * merchants and couriers whose names appear in ordinary receipts.
 */
function claimsInstitution(text: string, brand: string): boolean {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const claim = new RegExp(
    `(?:saya|kami|ini|aku)\\s+(?:adalah\\s+)?(?:dari\\s+)?(?:pihak\\s+)?${escaped}\\b` +
      `|\\b(?:cs|call\\s*center|customer\\s*service)\\s+${escaped}\\b` +
      `|\\b${escaped}\\s+(?:resmi|official)\\b`,
    "i",
  );
  return claim.test(text);
}

function claimedBrands(text: string): string[] {
  const brands = OFFICIAL.filter((official) =>
    claimsInstitution(text, official.brand),
  ).map((official) => official.brand);
  return brands.filter((brand, index) => brands.indexOf(brand) === index);
}

export interface IdentityResult {
  signals: Signal[];
  note?: string;
}

export function identitySignals(text: string): IdentityResult {
  const signals: Signal[] = [];

  const mobile = text.match(MOBILE_ID) ?? [];
  const foreign = (text.match(FOREIGN) ?? []).filter(
    (candidate) => !/^\+?62/.test(candidate.replace(/[\s-]/g, "")),
  );
  const shortcode = text.match(SHORTCODE);
  const brands = claimedBrands(text);

  if (brands.length > 0 && mobile.length > 0) {
    const brand = brands[0] ?? "";
    signals.push({
      label: `Mengaku dari ${brand} tapi nomornya ponsel biasa, bukan kanal resmi`,
      weight: 0.55,
      evidence: mobile[0] ?? "",
      agent: "identity",
    });
  }

  if (brands.length > 0 && foreign.length > 0) {
    const brand = brands[0] ?? "";
    signals.push({
      label: `Nomor asing mengaku dari ${brand} — institusi Indonesia tidak menelepon dari nomor luar`,
      weight: 0.6,
      evidence: foreign[0] ?? "",
      agent: "identity",
    });
  }

  if (brands.length > 0 && shortcode) {
    signals.push({
      label: `Nomor singkat mengaku dari ${brands[0] ?? ""} — cocokkan dengan nomor resmi di belakang kartu`,
      weight: 0.5,
      evidence: shortcode[0] ?? "",
      agent: "identity",
    });
  }

  if (FORWARD.test(text)) {
    signals.push({
      label:
        "Pesan diteruskan berantai — pengirim aslinya tidak bisa dipastikan",
      weight: 0.25,
      evidence: text.match(FORWARD)?.[0] ?? "Diteruskan",
      agent: "identity",
    });
  }

  const inspected = mobile.length + foreign.length + (shortcode ? 1 : 0);
  return {
    signals: signals.map((s) => annotateSignal(s)),
    // A stage that found something cannot also explain why it inspected
    // nothing. The note is the reason a stage is `dilewati`; emitting it
    // beside a finding contradicts the finding.
    note:
      inspected === 0 && signals.length === 0
        ? "Tidak ada nomor untuk diperiksa."
        : undefined,
  };
}

import {
  isIncidentNarrative,
  learningModulesFor,
  wantsLearning,
} from "@/lib/companion/intent";
import type { ScoreResult } from "@/lib/contracts/score";
import { modusFor } from "@/lib/modus";

/**
 * Companion replies — template based, no LLM, no network.
 *
 * The plan calls the LLM "the voice, not the judge" (§3). This module is that
 * voice in its cheapest form: sentences chosen from the deterministic
 * `ScoreResult`, never a score invented here.
 *
 * Because nothing leaves the device, the privacy promise in §11.7 holds
 * exactly. Upgrading to a model later means replacing this one function.
 */

/**
 * A message is a greeting when every word in it belongs to the greeting
 * vocabulary.
 *
 * The previous rule was "starts with halo/hai and is under 40 characters",
 * which classified `"Halo, ini dari BCA. Akun Anda diblokir."` (39 chars) as
 * small talk and skipped the detectors entirely. Anchoring the start is not
 * enough either — the whole message has to be greeting-shaped. Measured: this
 * keeps all four short scams analysable and still recognises "hi apa kabar".
 */
const GREETING_TOKENS = new Set([
  "halo",
  "hallo",
  "helo",
  "hai",
  "hi",
  "hello",
  "hei",
  "selamat",
  "pagi",
  "siang",
  "sore",
  "malam",
  "apa",
  "kabar",
  "kabarmu",
  "kabarnya",
  "terima",
  "kasih",
  "makasih",
  "thanks",
  "thank",
  "you",
  "ok",
  "oke",
  "okay",
  "sip",
  "baik",
  "baiklah",
  "boleh",
  "siap",
  "semua",
  "semuanya",
  "kak",
  "min",
  "admin",
  "bang",
  "mas",
  "mbak",
  "pak",
  "bu",
  "gan",
  "sis",
  "kalian",
  "lumina",
]);

/** Eight words is already a sentence; past that it is not a greeting. */
const MAX_GREETING_TOKENS = 8;

/**
 * Lowercase the first letter so a signal label can follow "Yang paling
 * menonjol: ". Skipped when the word starts with an acronym — turning "APK
 * hilang" into "aPK hilang" is worse than an awkward capital.
 */
function lowerFirst(text: string): string {
  const [first = "", second = ""] = text.split("");
  if (!first || first !== first.toUpperCase()) return text;
  if (second && second === second.toUpperCase() && /[A-Z]/.test(second)) {
    return text;
  }
  return first.toLowerCase() + text.slice(1);
}

export interface ReplyContext {
  /** True when this is the first user turn. */
  first: boolean;
  /** Did the message look like it contained something to check? */
  containsContent: boolean;
}

function opening(): string {
  return "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima. Saya akan tunjukkan kalimat mana yang berbahaya dan apa yang sebaiknya kamu lakukan.";
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Does this look like a greeting rather than something to analyse? */
export function isGreeting(text: string): boolean {
  const t = normalize(text);
  if (t.length === 0) return false;

  const tokens = t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0 || tokens.length > MAX_GREETING_TOKENS) return false;
  return tokens.every((token) => GREETING_TOKENS.has(token));
}

export function composeReply(
  text: string,
  result: ScoreResult | null,
  context: ReplyContext,
): string {
  if (isGreeting(text)) {
    return context.first
      ? opening()
      : "Siap. Kalau ada pesan lain yang mencurigakan, tempel saja.";
  }

  if (!result) {
    return context.first
      ? opening()
      : "Ceritakan atau tempel isinya, lalu saya periksa.";
  }

  if (!context.containsContent) {
    return "Saya belum menemukan apa pun di situ. Coba tempel isi pesannya, atau kirim tautannya.";
  }

  if (result.risk === "bersih" || result.risk === "rendah") {
    return "Sejauh yang bisa saya periksa, tidak ada pola penipuan yang jelas di situ. Tetap hati-hati kalau ada permintaan uang, kode OTP, atau tautan untuk login.";
  }

  const modus = modusFor(result.relatedModule);
  const lead =
    result.risk === "tinggi"
      ? "Ini berbahaya. Jangan bertindak dulu sebelum membaca alasannya."
      : "Ini mencurigakan. Belum tentu penipuan, tapi ada beberapa tanda yang perlu kamu periksa.";

  // Name the strongest finding in plain language: the single most useful
  // sentence for someone deciding what to do next.
  const top = result.signals.find((signal) => signal.weight > 0);
  const finding = top ? `Yang paling menonjol: ${lowerFirst(top.label)}.` : "";

  // The modus name keeps its own capitalisation. "File APK via WhatsApp" is a
  // name from modus.json; lowercasing it to "file apk via whatsapp" looks like
  // internal data leaking into the sentence.
  const modusLine = modus ? ` Polanya paling mirip dengan ${modus.nama}.` : "";

  // Only promise a module when there is one. `relatedModule` is null for
  // `tidak-dikenali`, and `suggestedActions` renders no button in that case —
  // the old sentence offered to explain "lewat modul yang terkait" and then
  // showed nothing to click.
  const next =
    result.risk === "tinggi"
      ? " Kalau uang sudah terkirim atau kode OTP sudah kamu berikan, hentikan komunikasi dan hubungi bank atau penyedia akun melalui kanal resmi dari perangkat lain yang aman."
      : modus
        ? " Kalau mau, saya bisa jelaskan polanya lebih jauh lewat modul yang terkait."
        : " Kalau ada pesan lain dari pengirim yang sama, tempel juga — beberapa pesan sekaligus sering lebih jelas daripada satu.";

  return `${lead} ${finding}${modusLine}${next}`.replace(/\s+/g, " ").trim();
}

/** Suggested next actions, rendered as buttons under the reply. */
export function suggestedActions(result: ScoreResult | null) {
  if (!result) return [];
  // A weight-0 signal is the engine saying it recognised nothing. Offering
  // "study this pattern" under that verdict is a claim the engine did not make.
  if (!result.signals.some((signal) => signal.weight > 0)) return [];
  const actions: { label: string; href: string }[] = [];

  if (result.relatedModule !== null) {
    actions.push({
      label: "Pelajari pola ini",
      href: `/belajar/${result.relatedModule}`,
    });
  }
  if (result.risk === "tinggi") {
    actions.push({ label: "Diskusikan pola ini", href: "/komunitas" });
  }
  const modus = modusFor(result.relatedModule);
  if (modus?.scenarioId) {
    actions.push({
      label: "Coba simulasi",
      href: `/simulasi/${modus.scenarioId}`,
    });
  }
  return actions;
}

/**
 * The sentence shown when the model could not answer a conversational lane.
 *
 * Separate from `composeReply` because there is no verdict to talk about: a
 * fallback that said "Saya belum menemukan apa pun di situ" answered a check
 * the user never asked for.
 */
export function composeAnswerFallback(
  lane: "tanya" | "lanjutan" | "obrolan",
  outcome: "unconfigured" | "timeout" | "failed" = "failed",
  context: { question: string; history: string[] } = {
    question: "",
    history: [],
  },
): string {
  const reason =
    outcome === "unconfigured"
      ? "Layanan AI percakapan belum dikonfigurasi."
      : outcome === "timeout"
        ? "Layanan AI terlalu lama menjawab. Coba kirim pertanyaanmu lagi."
        : "Layanan AI sedang gagal menjawab. Coba kirim pertanyaanmu lagi.";
  const incident = isIncidentNarrative(context.question);
  const incidentBefore = context.history.some(isIncidentNarrative);
  if (wantsLearning(context.question)) {
    const modules = learningModulesFor(context.question, context.history)
      .map((no) => modusFor(no)?.nama)
      .filter(Boolean);
    return `${reason} ${incidentBefore ? "Untuk kejadian yang kamu ceritakan, amankan akun dan laporkan transaksi yang tidak kamu lakukan terlebih dahulu. " : ""}Materi Lumina ada di Belajar${modules.length > 0 ? `; mulai dari ${modules.join(" dan ")}` : ""}. Materi ini membantu pencegahan, bukan memulihkan akun atau menjamin uang kembali.`;
  }
  if (incident) {
    return `${reason}\n\nKamu menceritakan dugaan peretasan atau kehilangan uang; itu tidak bisa dinyatakan aman dari skor sebuah pesan.\n1. Jika perangkat diduga terinfeksi, gunakan perangkat lain yang kamu percaya untuk mengamankan email dan akun terkait; ganti sandi/PIN dan keluar dari sesi yang tidak dikenal jika masih bisa masuk.\n2. Hubungi bantuan resmi penyedia akun dan bank/e-wallet melalui aplikasi atau situs resminya. Laporkan transaksi yang tidak kamu lakukan dan minta pengamanan akun; jika sudah kehilangan akses, gunakan pemulihan akun.\n3. Simpan bukti transaksi, waktu kejadian, dan nomor laporan. Untuk dugaan penipuan transaksi keuangan, laporkan ke IASC OJK. Pengembalian dana tidak dijamin.\n\nApakah kamu masih bisa masuk ke akun atau email pemulihannya? Jangan kirim sandi, PIN, atau OTP ke sini.`;
  }
  return lane === "lanjutan"
    ? `${reason} Hasil pemeriksaan sebelumnya tetap tersedia di kartu di atas.`
    : reason;
}

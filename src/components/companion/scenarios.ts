import { FileWarning, MessageSquareWarning, ShieldAlert } from "lucide-react";

/**
 * The starting points offered on an empty companion, and the cards the
 * carousel renders.
 *
 * These are the plan's §11.5 demo cases, word for word, because a judge will
 * compare the score on screen with the number in the proposal. They are the
 * only three messages in the product that are allowed to be a fixed string:
 * everything else comes from what the user types.
 *
 * `expects` is the measured band, not a promise. `score.test.ts` asserts each
 * one, so a change to the engine that moves a demo case fails the suite instead
 * of quietly changing the pitch.
 */

export interface Scenario {
  id: string;
  /** Short label on the card. */
  label: string;
  /** One line under the label, so the card says what it is testing. */
  hint: string;
  text: string;
  icon: typeof ShieldAlert;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "apk",
    label: "APK undangan",
    hint: "Berkas berbahaya lewat WhatsApp",
    text: "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.",
    icon: FileWarning,
  },
  {
    id: "topup",
    label: "Tugas top-up",
    hint: "Komisi yang menuntut setoran",
    text: "Halo kak, tugas hari ini tinggal like 10 video, komisi Rp15.000 sudah masuk. Untuk lanjut ke tugas berikutnya, kakak perlu top up saldo Rp500.000 dulu ya biar bisa ikut penarikan.",
    icon: MessageSquareWarning,
  },
  {
    id: "blokir",
    label: "Akun diblokir",
    hint: "Tekanan waktu + tautan pendek",
    text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.",
    icon: ShieldAlert,
  },
] as const;

import { Alert, AlertDescription } from "@/components/ui/alert";

const messages: Record<string, string> = {
  "google-unavailable":
    "Masuk dengan Google belum tersedia. Kamu tetap bisa menggunakan email dan password.",
  "google-cancelled":
    "Masuk dengan Google dibatalkan. Silakan coba lagi saat siap.",
  "google-expired":
    "Sesi Google kedaluwarsa atau tidak valid. Mulai lagi dari tombol Google.",
  "google-failed":
    "Belum berhasil masuk dengan Google. Coba lagi atau gunakan email dan password.",
  "google-link-required":
    "Email ini sudah memiliki akun. Masuk dengan metode yang digunakan saat mendaftar. Akun tidak digabung otomatis.",
};

export async function AuthFeedback({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error && messages[error];
  if (!message) return null;
  return (
    <Alert role="alert" variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

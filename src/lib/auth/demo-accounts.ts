/**
 * Demo accounts — hardcoded on purpose.
 *
 * THIS IS NOT REAL AUTHENTICATION. There is no password hashing because no
 * password is stored anywhere; comparison is against this literal table. That
 * is what keeps the privacy promise honest: nothing about a user ever reaches
 * a server.
 *
 * Do not copy this file into a product that stores real users. The plan records
 * the waiver in docs/plan.md §8 and .opencode/plan/2026-11-04-lumina-landing-auth.md.
 *
 * Pure data — importable from both server and client.
 */

export interface DemoAccount {
  email: string;
  password: string;
  nama: string;
  /** Shown on /masuk so a judge knows which state they are demonstrating. */
  summary: string;
  /** Mirrors the shape Stream B writes to localStorage. */
  seed: {
    completedModules: number[];
    badges: string[];
  };
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: "siti@lumina.id",
    password: "demo1234",
    nama: "Siti",
    summary: "Akun baru — belum ada modul selesai",
    seed: { completedModules: [], badges: [] },
  },
  {
    email: "budi@lumina.id",
    password: "demo1234",
    nama: "Budi",
    summary: "Sudah 3 modul, punya 1 badge",
    seed: { completedModules: [10, 1, 2], badges: ["Penjaga OTP"] },
  },
] as const;

export function findDemoAccount(
  email: string,
  password: string,
): DemoAccount | null {
  const normalised = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() === normalised &&
        account.password === password,
    ) ?? null
  );
}

export function emailTaken(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === normalised);
}

export interface AccountView {
  nama: string;
  email: string;
  createdAt: string | null;
}

export interface SessionView {
  id: string;
  device: string;
  ip: string | null;
  signedIn: string;
  lastActive: string;
  current: boolean;
}

export interface AccountPayload {
  ok: boolean;
  account?: AccountView;
  hasPassword?: boolean;
  sessions?: SessionView[];
  error?: string;
}

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

function firstMatch(
  value: string,
  table: Array<[RegExp, string]>,
  fallback: string,
): string {
  for (const [pattern, label] of table) {
    if (pattern.test(value)) return label;
  }
  return fallback;
}

export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "Perangkat tidak dikenal";
  return `${firstMatch(ua, BROWSERS, "Browser")} · ${firstMatch(ua, SYSTEMS, "sistem tidak dikenal")}`;
}

export function formatAccountDate(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatSessionMoment(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function elapsed(count: number, unit: string): string {
  return count < 0
    ? `${Math.abs(count)} ${unit} lalu`
    : `${count} ${unit} lagi`;
}

export function relativeActivity(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) < 1) return "baru saja";
  if (Math.abs(minutes) < 60) return elapsed(minutes, "menit");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return elapsed(hours, "jam");
  return elapsed(Math.round(hours / 24), "hari");
}

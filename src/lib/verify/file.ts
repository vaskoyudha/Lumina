import type { Signal } from "@/lib/contracts/score";
import type {
  FileVerification,
  ReputationVerdict,
} from "@/lib/contracts/verify";
import { providerJson } from "@/lib/verify/http";
export function inspectFileMetadata(file: {
  name: string;
  type: string;
  size: number;
}): Signal[] {
  const signals: Signal[] = [];
  const add = (id: string, label: string, weight: number) =>
    signals.push({
      label,
      weight,
      evidence: file.name,
      agent: "evidence",
      mechanism: "attachment-risk",
      ruleId: `file.${id}`,
    });
  if (
    /\.(?:pdf|docx?|xlsx?|jpe?g|png|txt)\.(?:apk|exe|scr|js|bat|cmd|zip|rar)$/i.test(
      file.name,
    )
  )
    add(
      "double-extension",
      "Nama berkas memakai ekstensi ganda yang menyamarkan jenisnya",
      0.8,
    );
  const expected: Record<string, RegExp> = {
    pdf: /application\/pdf/,
    png: /image\/png/,
    jpg: /image\/jpeg/,
    jpeg: /image\/jpeg/,
    apk: /application\/(?:vnd\.android\.package-archive|octet-stream)/,
    zip: /application\/(?:zip|x-zip-compressed|octet-stream)/,
  };
  const extension = file.name.toLowerCase().split(".").at(-1) ?? "";
  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    expected[extension] &&
    !expected[extension].test(file.type)
  )
    add(
      "mime-mismatch",
      "Ekstensi dan tipe berkas yang dilaporkan browser berbeda",
      0.3,
    );
  if (/[\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/u.test(file.name))
    add(
      "hidden-name",
      "Nama berkas memuat karakter tersembunyi atau pengubah arah",
      0.45,
    );
  if (file.size === 0)
    add("empty", "Berkas kosong; isi tidak dapat diperiksa", 0.1);
  return signals;
}
export async function sha256File(
  file: Pick<File, "size" | "arrayBuffer">,
): Promise<string> {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Hash lokal dibatasi 50 MB.");
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function verifyFileHash(
  sha256: string,
  signal: AbortSignal,
): Promise<FileVerification> {
  const sources: ReputationVerdict[] = [];
  const work = async (source: string, fn: () => Promise<boolean>) => {
    try {
      return { source, listed: await fn(), status: "ok" as const };
    } catch {
      return { source, listed: null, status: "tidak tersedia" as const };
    }
  };
  sources.push(
    ...(await Promise.all([
      process.env.MALWAREBAZAAR_AUTH_KEY
        ? work("MalwareBazaar", async () => {
            const data = (await providerJson(
              "https://mb-api.abuse.ch/api/v1/",
              {
                method: "POST",
                headers: {
                  "Auth-Key": process.env.MALWAREBAZAAR_AUTH_KEY as string,
                  "content-type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ query: "get_info", hash: sha256 }),
              },
              signal,
            )) as { query_status?: string };
            if (data.query_status === "hash_not_found") return false;
            if (data.query_status !== "ok") throw new Error("source");
            return true;
          })
        : Promise.resolve({
            source: "MalwareBazaar",
            listed: null,
            status: "tidak tersedia" as const,
          }),
      process.env.VIRUSTOTAL_API_KEY
        ? work("VirusTotal", async () => {
            const data = (await providerJson(
              `https://www.virustotal.com/api/v3/files/${sha256}`,
              {
                headers: {
                  "x-apikey": process.env.VIRUSTOTAL_API_KEY as string,
                },
              },
              signal,
              true,
            )) as {
              data?: {
                attributes?: { last_analysis_stats?: { malicious?: number } };
              };
            } | null;
            if (data === null) return false;
            const malicious =
              data.data?.attributes?.last_analysis_stats?.malicious;
            if (typeof malicious !== "number") throw new Error("source");
            return malicious > 0;
          })
        : Promise.resolve({
            source: "VirusTotal",
            listed: null,
            status: "tidak tersedia" as const,
          }),
    ])),
  );
  const listed = sources.some((s) => s.listed);
  return {
    status: sources.some((s) => s.status === "ok") ? "ok" : "dilewati",
    sha256,
    sources,
    signals: listed
      ? [
          {
            label: "Hash berkas tercatat berbahaya pada sumber reputasi publik",
            weight: 0.95,
            evidence: sha256,
            agent: "evidence",
            mechanism: "attachment-risk",
            ruleId: "file.hash-listed",
          },
        ]
      : [],
    note: listed
      ? "Hash tercatat pada sumber reputasi. Berkas tidak diunggah atau dijalankan."
      : "Tidak ada hasil berbahaya yang terkonfirmasi; ketiadaan hash atau API bukan bukti berkas aman. Metadata paket, izin dan tanda tangan APK belum dianalisis.",
  };
}

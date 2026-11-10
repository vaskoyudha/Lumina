import { resolveMx, resolveTxt } from "node:dns/promises";
import type { LinkVerification } from "@/lib/contracts/verify";
import { parseLink } from "@/lib/scoring/link";
import { guardUrl, pinnedRequest, publicJson } from "@/lib/server/url-guard";
import { lookupBlocklists } from "@/lib/verify/blocklists";
import { cachedReputation } from "@/lib/verify/reputation";
export async function verifyPublicLink(
  raw: string,
  signal: AbortSignal,
  mode: "direct" | "cached" = "direct",
): Promise<LinkVerification> {
  const base: LinkVerification = {
    url: raw,
    status: "gagal",
    domainAgeDays: null,
    tls: null,
    redirects: [],
    blocklists: [],
    signals: [],
  };
  if (mode === "cached") {
    const cached = cachedReputation(raw);
    return {
      ...base,
      status: "dilewati",
      blocklists: cached.sources,
      note: cached.note,
      signals: cached.sources.some((s) => s.listed)
        ? [
            {
              label: "Tautan tercatat pada cache sumber ancaman publik",
              weight: 0.9,
              evidence: raw,
              agent: "link",
              mechanism: "link-deception",
              ruleId: "link.blocklist",
            },
          ]
        : [],
    };
  }
  try {
    let target = await guardUrl(raw);
    const host = target.url.hostname;
    let next = target.url.href;
    const result = await Promise.allSettled([
      (async () => {
        const chain: string[] = [];
        let tls: LinkVerification["tls"] = null;
        for (let hop = 0; hop <= 3; hop++) {
          if (hop > 0) target = await guardUrl(next);
          let response = await pinnedRequest(target, signal);
          if (response.status === 405 || response.status === 501)
            response = await pinnedRequest(target, signal, "GET");
          tls = response.tls;
          if (
            response.status >= 300 &&
            response.status < 400 &&
            response.location
          ) {
            if (hop === 3) throw new Error("redirect-limit");
            next = new URL(response.location, next).href;
            chain.push(next);
            continue;
          }
          return { chain, tls };
        }
        throw new Error("redirect-limit");
      })(),
      (async () => {
        const domain = parseLink(raw)?.registrable ?? host;
        const data = (await publicJson(
          `${process.env.RDAP_BASE_URL?.replace(/\/$/, "") ?? "https://rdap.org/domain"}/${encodeURIComponent(domain)}`,
          signal,
        )) as { events?: { eventAction: string; eventDate: string }[] };
        const at = Date.parse(
          data.events?.find((e) => e.eventAction === "registration")
            ?.eventDate ?? "",
        );
        return Number.isFinite(at)
          ? Math.max(0, Math.floor((Date.now() - at) / 86400000))
          : null;
      })(),
      (async () => {
        const [mx, spf, dmarc] = await Promise.allSettled([
          resolveMx(host),
          resolveTxt(host),
          resolveTxt(`_dmarc.${host}`),
        ]);
        return {
          a: target.all.some((ip) => !ip.includes(":")),
          aaaa: target.all.some((ip) => ip.includes(":")),
          mx: mx.status === "fulfilled" && mx.value.length > 0,
          spf:
            spf.status === "fulfilled" &&
            spf.value.flat().some((v) => /^v=spf1/i.test(v)),
          dmarc:
            dmarc.status === "fulfilled" &&
            dmarc.value.flat().some((v) => /^v=DMARC1/i.test(v)),
        };
      })(),
      lookupBlocklists(raw, signal),
    ]);
    if (signal.aborted)
      return {
        ...base,
        note: "Batas waktu verifikasi tercapai; hasil lokal dipertahankan.",
      };
    const [head, rdap, dns, blocklists] = result;
    if (head.status !== "fulfilled")
      return {
        ...base,
        note: "Tujuan atau redirect tidak dapat diverifikasi; tidak ada sinyal tambahan.",
      };
    const age = rdap.status === "fulfilled" ? rdap.value : null;
    const sources = blocklists.status === "fulfilled" ? blocklists.value : [];
    const signals: LinkVerification["signals"] = [];
    if (sources.some((s) => s.listed))
      signals.push({
        label: "Tautan tercatat pada sumber ancaman publik",
        weight: 0.9,
        evidence: raw,
        agent: "link",
        mechanism: "link-deception",
        ruleId: "link.blocklist",
      });
    if (age !== null && age < 30)
      signals.push({
        label: "Domain berusia kurang dari 30 hari; perlu verifikasi tambahan",
        weight: 0.25,
        evidence: raw,
        agent: "link",
        mechanism: "link-deception",
        ruleId: "link.domain-age",
      });
    return {
      ...base,
      status: "ok",
      tls: head.value.tls,
      redirects: head.value.chain,
      domainAgeDays: age,
      dns: dns.status === "fulfilled" ? dns.value : undefined,
      blocklists: sources,
      signals,
      note: "Fakta publik diperiksa; tidak terdaftar pada blocklist bukan jaminan aman.",
    };
  } catch {
    return {
      ...base,
      note: "Alamat bukan tujuan publik yang diizinkan atau sumber verifikasi tidak tersedia.",
    };
  }
}

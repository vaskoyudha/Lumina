import { buatFilterKonten } from "@/lib/loker/filters";
import { teksLoker, uraiKueri } from "@/lib/loker/query";

const JOBS = [
  {
    id: "1",
    title: "Fullstack Engineer (React/Node)",
    description: "Membangun layanan web.",
    location: "Remote",
    tags: ["React", "Node"],
  },
  {
    id: "2",
    title: "React Native Developer",
    description: "Aplikasi mobile.",
    location: "Remote",
    tags: ["React"],
  },
  {
    id: "3",
    title: "Web Developer",
    description:
      "Lowongan ini menawarkan gaji tinggi untuk kandidat berpengalaman.",
    location: "Bandung",
    tags: [],
  },
  {
    id: "4",
    title: "Frontend Engineer (Junior)",
    description: "Membangun antarmuka.",
    location: "Jakarta",
    tags: ["TypeScript"],
  },
  {
    id: "5",
    title: "Backend Engineer (Node.js)",
    description: "Membangun API.",
    location: "Jakarta",
    tags: ["Node"],
  },
  {
    id: "6",
    title: "Frontend Engineer",
    description: "React dan TypeScript.",
    location: "Jakarta",
    tags: ["React"],
  },
];

const cari = (q: string) => {
  const terms = uraiKueri(q);
  // AND across terms, one ported filter each — the rule stays single-sourced.
  const perTerm = terms.map((t) => buatFilterKonten({ positive: [t] }));
  return JOBS.filter((job) => perTerm.every((f) => f(teksLoker(job)))).map(
    (job) => job.title,
  );
};

describe("uraiKueri", () => {
  it("drops the filler words a job query is wrapped in", () => {
    expect(uraiKueri("lowongan remote")).toEqual(["remote"]);
    expect(uraiKueri("cari lowongan kerja react")).toEqual(["react"]);
  });

  it("keeps every word that discriminates", () => {
    expect(uraiKueri("react")).toEqual(["react"]);
    expect(uraiKueri("jakarta")).toEqual(["jakarta"]);
    expect(uraiKueri("lowongan react remote jakarta")).toEqual([
      "react",
      "remote",
      "jakarta",
    ]);
  });

  it("splits on punctuation so a compound token is not one term", () => {
    expect(uraiKueri("React/Node")).toEqual(["react", "node"]);
    // "Rp6-8" splits into "rp6" and "8", and the one-character fragment falls
    // below the minimum — the assertion that matters is that "rp68" is not a term.
    expect(uraiKueri("Rp6-8")).toEqual(["rp6"]);
  });

  it("keeps a two-character term and drops a one-character one", () => {
    expect(uraiKueri("js")).toEqual(["js"]);
    expect(uraiKueri("a c go")).toEqual(["go"]);
  });

  it("de-duplicates and is case-insensitive", () => {
    expect(uraiKueri("React react REACT")).toEqual(["react"]);
  });

  it("returns nothing for a query that is only filler", () => {
    expect(uraiKueri("lowongan")).toEqual([]);
    expect(uraiKueri("   ")).toEqual([]);
    expect(uraiKueri("")).toEqual([]);
  });

  it("returns every term so the caller can require all of them", () => {
    expect(uraiKueri("lowongan React remote Jakarta").sort()).toEqual(
      ["jakarta", "react", "remote"].sort(),
    );
  });
});

describe("cari — the chat query against the inline board", () => {
  it('"lowongan remote" no longer drags in the Bandung posting', () => {
    const hasil = cari("lowongan remote");
    expect(hasil).toContain("Fullstack Engineer (React/Node)");
    expect(hasil).toContain("React Native Developer");
    expect(hasil).not.toContain("Web Developer");
  });

  it('"jakarta" now matches, because location is searched', () => {
    const hasil = cari("jakarta");
    expect(hasil).toContain("Frontend Engineer (Junior)");
    expect(hasil).toContain("Backend Engineer (Node.js)");
  });

  it("requires every term, so two words narrow rather than widen", () => {
    const semuaRemote = cari("remote");
    expect(semuaRemote.length).toBeGreaterThan(1);
    // React AND remote is a strict subset of React OR remote.
    expect(cari("react remote").length).toBeLessThan(cari("react").length);
    expect(cari("react remote").every((t) => semuaRemote.includes(t))).toBe(
      true,
    );
  });

  it("returns the whole visible board for a filler-only query", () => {
    expect(cari("lowongan")).toHaveLength(JOBS.length);
  });
});

describe("teksLoker", () => {
  it("includes location and tags, not just the description", () => {
    const teks = teksLoker(JOBS[3]);
    expect(teks).toContain("Jakarta");
    expect(teks).toContain("TypeScript");
  });
});

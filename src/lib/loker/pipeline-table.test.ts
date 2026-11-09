/** @jest-environment node */
import { parseInbox, splitLines } from "@/lib/loker/pipeline-table";

describe("splitLines", () => {
  it("splits on bare LF", () => {
    expect(splitLines("a\nb\nc")).toEqual(["a", "b", "c"]);
  });

  it("tolerates CRLF without leaving a trailing carriage return", () => {
    const lines = splitLines("a\r\nb\r\nc");
    expect(lines).toEqual(["a", "b", "c"]);
    for (const line of lines) expect(line.endsWith("\r")).toBe(false);
  });
});

describe("parseInbox", () => {
  it("parses a minimal url | company | role row", () => {
    const jobs = parseInbox("- [ ] https://x.test/jobs/1 | Acme | Engineer");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual({
      done: false,
      url: "https://x.test/jobs/1",
      company: "Acme",
      role: "Engineer",
      location: undefined,
      compensation: undefined,
      postedAt: undefined,
    });
  });

  it("reads the optional 4th location and 5th compensation columns", () => {
    const jobs = parseInbox(
      "- [ ] https://x.test/jobs/1 | Acme | Engineer | Jakarta | Rp 10-15 jt",
    );
    expect(jobs[0].role).toBe("Engineer");
    expect(jobs[0].location).toBe("Jakarta");
    expect(jobs[0].compensation).toBe("Rp 10-15 jt");
  });

  it("marks a checked row as done", () => {
    expect(
      parseInbox("- [x] https://x.test/jobs/1 | Acme | Engineer")[0].done,
    ).toBe(true);
    expect(
      parseInbox("- [X] https://x.test/jobs/2 | Acme | Engineer")[0].done,
    ).toBe(true);
  });

  it("treats labeled segments as labels, not columns, and fills postedAt", () => {
    const [job] = parseInbox(
      "- [ ] https://x.test/jobs/1 | Acme | Engineer | posted: 2026-07-14 | trust: 62 stale",
    );
    expect(job.location).toBeUndefined();
    expect(job.compensation).toBeUndefined();
    expect(job.postedAt).toBe("2026-07-14");
  });

  it("does not let a labeled segment bleed into location on a short row", () => {
    const [job] = parseInbox(
      "- [ ] https://x.test/jobs/1 | Acme | Engineer | trust: 62 stale",
    );
    expect(job.location).toBeUndefined();
    expect(job.postedAt).toBeUndefined();
  });

  it("skips rows with fewer than three columns", () => {
    expect(parseInbox("- [ ] https://x.test/jobs/1 | Acme")).toEqual([]);
  });

  it("parses CRLF rows the same as LF", () => {
    const md =
      "- [ ] https://x.test/jobs/1 | Acme | Engineer\r\n- [x] https://x.test/jobs/2 | Beta | Designer\r\n";
    const jobs = parseInbox(md);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].role).toBe("Engineer");
    expect(jobs[1].done).toBe(true);
    expect(jobs[1].company).toBe("Beta");
  });
});

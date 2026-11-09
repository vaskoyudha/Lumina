import {
  JOB_SEARCH_TOOL,
  JobSearchArgsSchema,
  ToolSummaryRequestSchema,
} from "@/lib/contracts/tool";

describe("JobSearchArgsSchema", () => {
  it("accepts the minimal call", () => {
    expect(JobSearchArgsSchema.safeParse({ query: "React" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown key instead of ignoring it", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "React", message: "x" }).success,
    ).toBe(false);
  });

  it("caps the query at 200 characters", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("requires a non-empty query", () => {
    expect(JobSearchArgsSchema.safeParse({ query: "" }).success).toBe(false);
  });

  it("rejects a non-integer salary", () => {
    expect(
      JobSearchArgsSchema.safeParse({ query: "React", salaryMin: 1.5 }).success,
    ).toBe(false);
  });
});

describe("ToolSummaryRequestSchema", () => {
  const posting = {
    title: "Frontend Engineer",
    company: "PT Maju",
    sentinelStatus: "clean",
    luminaRisk: "bersih",
  };

  it("accepts titles, companies, and verdicts", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({ count: 1, postings: [posting] })
        .success,
    ).toBe(true);
  });

  it("rejects a description, which must never leave the device", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({
        count: 1,
        postings: [{ ...posting, description: "kutipan" }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 20 postings", () => {
    expect(
      ToolSummaryRequestSchema.safeParse({
        count: 21,
        postings: Array.from({ length: 21 }, () => posting),
      }).success,
    ).toBe(false);
  });
});

describe("JOB_SEARCH_TOOL", () => {
  it("names the function and requires only the query", () => {
    expect(JOB_SEARCH_TOOL.function.name).toBe("job_search");
    expect(JOB_SEARCH_TOOL.function.parameters.required).toEqual(["query"]);
    expect(JOB_SEARCH_TOOL.function.parameters.additionalProperties).toBe(
      false,
    );
  });
});

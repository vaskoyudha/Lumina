import {
  JOB_SEARCH_TOOL,
  JobSearchArgsSchema,
  REPORT_TOOL,
  ReportDraftArgsSchema,
  ToolCallSchema,
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

describe("ReportDraftArgsSchema", () => {
  it("accepts an empty call and a named channel", () => {
    expect(ReportDraftArgsSchema.safeParse({}).success).toBe(true);
    expect(
      ReportDraftArgsSchema.safeParse({ channel: "komdigi" }).success,
    ).toBe(true);
  });

  it("rejects an unknown channel instead of ignoring it", () => {
    expect(ReportDraftArgsSchema.safeParse({ channel: "bank" }).success).toBe(
      false,
    );
  });

  it("has no field for a message, a verdict, or a report body", () => {
    expect(
      ReportDraftArgsSchema.safeParse({ message: "Halo dari BCA" }).success,
    ).toBe(false);
    expect(
      ReportDraftArgsSchema.safeParse({ body: "Nama: Sari" }).success,
    ).toBe(false);
  });
});

describe("ToolCallSchema", () => {
  it("discriminates the two tools", () => {
    expect(
      ToolCallSchema.safeParse({
        id: "1",
        name: "job_search",
        arguments: { query: "React" },
      }).success,
    ).toBe(true);
    expect(
      ToolCallSchema.safeParse({
        id: "2",
        name: "report_draft",
        arguments: { channel: "iasc" },
      }).success,
    ).toBe(true);
  });

  it("rejects a report call carrying job-search arguments", () => {
    expect(
      ToolCallSchema.safeParse({
        id: "3",
        name: "report_draft",
        arguments: { query: "React" },
      }).success,
    ).toBe(false);
  });
});

describe("REPORT_TOOL", () => {
  it("requires no argument", () => {
    expect(REPORT_TOOL.function.name).toBe("report_draft");
    const parameters = REPORT_TOOL.function.parameters as {
      required?: string[];
      additionalProperties?: boolean;
    };
    expect(parameters.required).toBeUndefined();
    expect(parameters.additionalProperties).toBe(false);
  });
});

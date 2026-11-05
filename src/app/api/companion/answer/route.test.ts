/**
 * @jest-environment node
 */
import { POST } from "@/app/api/companion/answer/route";
import { AnswerRequestSchema } from "@/lib/contracts/answer";

const QUESTION =
  "apa itu pinjol? soalnya tetangga saya dapat tawaran pinjaman lewat WhatsApp";

function request(body: unknown): Request {
  return new Request("http://localhost/api/companion/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AnswerRequestSchema · the privacy boundary is structural", () => {
  it("accepts a question with no checks attached", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a top-level field that could carry the received message", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "tanya",
      question: "apa itu pinjol?",
      message: "Halo, ini dari BCA. Akun Anda diblokir.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects evidence inside a nested object", () => {
    const parsed = AnswerRequestSchema.safeParse({
      lane: "lanjutan",
      question: "kenapa berbahaya?",
      digest: {
        risk: "tinggi",
        score: 80,
        modusName: "Pinjol fiktif",
        findings: [
          { label: "Menawarkan pinjaman", weight: 0.8, evidence: "kutipan" },
        ],
        advice: ["Jangan transfer"],
        moduleNo: 9,
        locale: "id",
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("POST /api/companion/answer", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      LUMINA_LLM_URL: "http://llm.test/v1",
      LUMINA_LLM_MODEL: "test-model",
    };
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it("returns the model's text and sends only the question", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Pinjol adalah pinjaman ilegal." } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await POST(
      request({
        lane: "tanya",
        question: QUESTION,
        history: [
          { role: "user", text: "Halo, ini dari BCA. Akun Anda diblokir." },
        ],
      }),
    );
    const body = (await response.json()) as { ok: boolean; text: string };

    expect(response.status).toBe(200);
    expect(body.text).toBe("Pinjol adalah pinjaman ilegal.");

    const sent = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(sent).toContain("apa itu pinjol?");
    // The digest route's rule, restated for this route: nothing but what the
    // user typed.
    expect(sent).not.toContain("diblokir");
  });

  it("rejects an unknown field instead of ignoring it", async () => {
    const response = await POST(
      request({ lane: "tanya", question: "apa itu pinjol?", message: "x" }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid-request",
    });
  });

  it("reports not-configured instead of pretending the model answered", async () => {
    process.env.LUMINA_LLM_URL = "";
    const response = await POST(request({ lane: "tanya", question: "halo" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not-configured",
    });
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";
import type { LokerCorpus, LokerView } from "@/lib/loker/types";
import * as orchestratorClient from "@/lib/orchestrator/client";
import * as scoring from "@/lib/scoring/score";

jest.mock("@/lib/orchestrator/client", () => {
  const actual = jest.requireActual<typeof orchestratorClient>(
    "@/lib/orchestrator/client",
  );
  return { ...actual, streamOrchestrator: jest.fn(actual.streamOrchestrator) };
});

jest.mock("@/lib/scoring/score", () => {
  const actual = jest.requireActual<typeof scoring>("@/lib/scoring/score");
  return { ...actual, scoreWithTrace: jest.fn(actual.scoreWithTrace) };
});

jest.mock("@/lib/companion/history", () => ({
  listConversationHistory: jest.fn(async () => ({
    ok: true,
    conversations: [],
  })),
  saveConversationHistory: jest.fn(async () => ({ ok: true })),
}));

/**
 * This suite renders the whole conversation client and runs the full
 * deterministic pipeline. The full run executes it beside ~60 other suites on
 * 12 cores, where Jest's 5 s default measures the scheduler rather than the
 * component; 30 s still fails a genuine hang, while the earlier 15 s budget
 * was still too tight for the panel-link case on a loaded host.
 */
jest.setTimeout(30_000);

/**
 * These render the real conversation component. The Evidence Agent is only
 * honest if the *rendered* panel shows the bundle it claims to have built, so
 * every assertion here is about something a judge can point at on screen.
 */

jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

let mockPathname = "/companion";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  mockPathname = "/companion";
});

/**
 * Paste, not type. Every test here asserts what the engine and the panel do
 * with a message; simulating ~100 keystrokes adds seconds of wall clock that
 * no assertion reads, and under the full parallel run that cost pushed this
 * suite past its timeout. The controlled textarea receives the same event.
 */
async function enterMessage(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.click(screen.getByPlaceholderText(/tempel pesan/i));
  await user.paste(text);
}

const APK_MESSAGE =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.";

async function sendApk(user: ReturnType<typeof userEvent.setup>) {
  await enterMessage(user, APK_MESSAGE);
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));
}

describe("CompanionChat · real user intent regressions", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    jest.mocked(scoring.scoreWithTrace).mockClear();
    fetchMock = jest.fn(async () => ({
      ok: false,
      status: 503,
      body: null,
      json: async () => ({ error: "not-configured" }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  async function sendText(
    user: ReturnType<typeof userEvent.setup>,
    text: string,
  ) {
    await enterMessage(user, text);
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));
    await waitFor(() =>
      expect(screen.queryByText("Menyusun jawaban")).not.toBeInTheDocument(),
    );
  }

  it("answers the attached-code question without running detectors or sending the file", async () => {
    const scoreSpy = jest.mocked(scoring.scoreWithTrace);
    const user = userEvent.setup();
    render(<CompanionChat />);
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error("file input missing");
    await user.upload(
      fileInput,
      new File(["private file contents"], "Enkripsi_Dekripsi_Materi.pdf", {
        type: "application/pdf",
      }),
    );
    await sendText(user, "itu isi kode nya apa");
    expect(
      (
        await screen.findAllByText(
          /Teks PDF belum bisa dibaca di perangkat ini/i,
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(scoreSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    const log = screen.getByRole("log", { name: /percakapan/i });
    expect(within(log).queryByTestId("agent-message")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /periksa sebagai pesan/i }),
    );
    await waitFor(() => expect(scoreSpy).toHaveBeenCalled());
    expect(scoreSpy.mock.calls[0]?.[0].text).toContain(
      "Enkripsi_Dekripsi_Materi.pdf",
    );
  });

  it("keeps an incident and a course request in context, with learning links and no score", async () => {
    const scoreSpy = jest.mocked(scoring.scoreWithTrace);
    const user = userEvent.setup();
    render(<CompanionChat />);
    const incident =
      "pas aku doowload game bajakan akun tokopedia aku ke hack dan aku kehilangan duit karena gopay aku connect ke tokped";
    await sendText(user, incident);
    expect(
      await screen.findByText(/dugaan peretasan atau kehilangan uang/i),
    ).toBeInTheDocument();
    await sendText(
      user,
      "kasih solusi yg jelas dong, ada course yg berguna ga",
    );
    expect(
      await screen.findByRole("link", { name: "File APK via WhatsApp" }),
    ).toHaveAttribute("href", "/belajar/10");
    expect(
      screen.getByRole("link", { name: /Phishing tautan/i }),
    ).toHaveAttribute("href", "/belajar/7");
    expect(scoreSpy).not.toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const bodies = calls
      .filter(([url]) => url === "/api/companion/answer")
      .map(([, init]) => JSON.parse(String(init.body)));
    expect(bodies[0].lane).toBe("obrolan");
    expect(bodies[1].lane).toBe("tanya");
    expect(bodies[1].history).toContainEqual({ role: "user", text: incident });
    expect(
      screen.queryByText(/tidak ada pola penipuan yang jelas/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-job-search")).not.toBeInTheDocument();
  });

  it("routes an image check through the agent orchestrator", async () => {
    const orchestrate = jest.mocked(orchestratorClient.streamOrchestrator);
    orchestrate.mockImplementationOnce(async (_request, options) => {
      const event = {
        type: "plan" as const,
        runId: "run-image",
        seq: 1,
        at: 0,
        rationale: "Memeriksa lampiran.",
        agents: [
          {
            agent: "message" as const,
            task: "Baca pesan pada gambar",
            skills: [],
            tools: [],
          },
        ],
        planner: "model" as const,
        ms: 1,
      };
      options.onEvent?.(event);
      return {
        outcome: "model" as const,
        text: "Jawaban agen dari gambar.",
        events: [event],
        trace: null,
        score: null,
      };
    });
    fetchMock.mockImplementation(async (input) => {
      if (String(input).includes("/api/companion/vision")) {
        return {
          ok: true,
          status: 200,
          body: null,
          json: async () => ({
            ok: true,
            text: "Lowongan kerja Admin Toko, gaji Rp4.500.000.",
          }),
        };
      }
      return {
        ok: false,
        status: 503,
        body: null,
        json: async () => ({ error: "not-configured" }),
      };
    });

    const user = userEvent.setup();
    render(<CompanionChat orchestrator />);
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error("file input missing");
    await user.upload(
      fileInput,
      new File(["image-bytes"], "lowongan.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => expect(orchestrate).toHaveBeenCalledTimes(1));
    const request = orchestrate.mock.calls[0]?.[0];
    expect(request?.lane).toBe("periksa");
    expect(request?.question).toBe("Periksa isi gambar ini.");
    expect(request?.message).toContain("Lowongan kerja Admin Toko");
    expect(
      await screen.findByText("Jawaban agen dari gambar."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Proses agen")).toBeInTheDocument();
    expect(screen.queryByText("Orkestrator")).not.toBeInTheDocument();
  });

  it("excludes a checked message from later conversational history in every lane", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);
    await sendApk(user);
    await screen.findAllByText("File APK via WhatsApp");
    await sendText(user, "ada course yg berguna ga");
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const body = calls.find(([url]) => url === "/api/companion/answer")?.[1]
      .body;
    expect(String(body)).not.toContain(APK_MESSAGE);
    expect(String(body)).not.toContain("Undangan-Pernikahan.apk");
  });
});

describe("CompanionChat · evidence panel", () => {
  it("shows the extracted artifact without faking a detector", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    // The artifact label is the panel's, not the score card's: it names the
    // file the message asked the user to open.
    expect(
      await screen.findByText(/berkas APK yang dikirim atau diminta dibuka/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/bukti tercatat/i)).toBeInTheDocument();

    // Every agent in the panel now runs, so the old "belum aktif" label must be
    // gone. Honesty moved to the coverage line: a stage with nothing to inspect
    // is named as skipped, with the reason, rather than wearing a green tick.
    expect(screen.queryByText(/belum aktif/i)).not.toBeInTheDocument();
    expect(screen.getByText(/\d+ diperiksa/i)).toBeInTheDocument();
  });

  it("highlights the phrase that triggered a finding", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    const highlights = await screen.findAllByRole("button", {
      name: /^Temuan:/i,
    });
    expect(highlights.length).toBeGreaterThan(0);

    const first = highlights[0];
    if (!first) throw new Error("expected at least one evidence highlight");
    expect(first).toHaveAttribute("aria-pressed", "false");

    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");

    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "false");
  });

  it("links a panel finding back to the message quote", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    const panelLinks = await screen.findAllByRole("button", {
      name: /lihat di pesan/i,
    });
    const panelLink = panelLinks[0];
    if (!panelLink) throw new Error("expected a panel finding link");

    await user.click(panelLink);
    const highlights = await screen.findAllByRole("button", {
      name: /^Temuan:/i,
    });
    expect(
      highlights.some(
        (button) => button.getAttribute("aria-pressed") === "true",
      ),
    ).toBe(true);

    await user.click(panelLink);
    expect(
      highlights.every(
        (button) => button.getAttribute("aria-pressed") === "false",
      ),
    ).toBe(true);
  });

  it("surfaces the combination finding when two vectors agree", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(
      user,
      "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The finding itself, on the result card and again in the panel.
    expect(
      (
        await screen.findAllByText(
          /hadiah tetapi meminta pembayaran lebih dulu/i,
        )
      ).length,
    ).toBeGreaterThan(0);

    // And the panel credits it to a real agent.
    const findings = within(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    );
    expect(findings.getByText("Conversation Agent")).toBeInTheDocument();
  });

  it("names the modus instead of printing its internal id", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    // The score card names it and the panel repeats it, on purpose: the panel
    // is read on its own when the transcript has scrolled away.
    expect(
      (await screen.findAllByText("File APK via WhatsApp")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("apk-whatsapp")).not.toBeInTheDocument();
  });

  it("records the recipient name from a QRIS sticker typed into the chat", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(
      user,
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(
      (await screen.findAllByText(/nama penerima yang disebut/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Hadi Wibowo").length).toBeGreaterThan(0);
  });
});

describe("CompanionChat · an honest zero", () => {
  it("does not report a finding when nothing was recognised", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    // The engine answers an unrecognised message with a single weight-0
    // placeholder so the panel is never empty. That placeholder is not a
    // finding, and counting it printed "1 temuan" beside a 0/100 "Bersih"
    // verdict — the panel contradicting its own score.
    //
    // 215 characters: above PASTE_LENGTH, so the engine runs, but it contains
    // no finding, link, phone, number, or money word. The card must read
    // 0/100 "Bersih" and the panel must say "0 temuan".
    const BENIGN_PASTE =
      "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan " +
      "aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku " +
      "yang sudah lewat tenggat dua hari. setelah itu kita makan siang bareng ya";

    await enterMessage(user, BENIGN_PASTE);
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const panel = await screen.findByRole("list", {
      name: /temuan terdeteksi/i,
    });
    const card = panel.closest("[data-slot='card']") ?? document.body;

    // The verdict is rendered as a number and a unit in separate text nodes,
    // so assert each half inside the panel rather than the joined string.
    expect(
      within(card as HTMLElement).getByText("0", { selector: "p" }),
    ).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("/100")).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getAllByText(/^0 temuan$/).length,
    ).toBeGreaterThan(0);
    expect(
      within(card as HTMLElement).queryAllByText(/^1 temuan$/),
    ).toHaveLength(0);

    // A bundle with no quote is a skipped stage, not a finished one.
    const log = await screen.findByRole("log", { name: /percakapan/i });
    const evidence = within(log).getByTestId("agent-evidence");
    expect(evidence).toHaveAttribute("data-status", "dilewati");
    expect(
      within(evidence).getByText(/tidak ada kutipan yang bisa dicatat/i),
    ).toBeInTheDocument();
  });
});

describe("CompanionChat · a question is not a bad message", () => {
  it("answers a question about a scam without a score card or a trace", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(user, "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The evidence panel always lists every agent by name, so the transcript is
    // addressed by its own log: this turn must add no agent row to it.
    const log = await screen.findByRole("log", { name: /percakapan/i });

    // The measured defect: this message used to score 70/tinggi, showing a red
    // card about the person asking the question.
    expect(
      await within(log).findByText(/Dijawab sebagai pertanyaan/i),
    ).toBeInTheDocument();
    expect(within(log).queryByText(/70\/100/)).not.toBeInTheDocument();
    expect(within(log).queryByText("Message Agent")).not.toBeInTheDocument();
    expect(
      within(log).queryByText("Scoring Orchestrator"),
    ).not.toBeInTheDocument();
  });

  it("lets the reader turn the question into a check with one tap", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(user, "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const retry = await screen.findByRole("button", {
      name: /periksa sebagai pesan/i,
    });
    await user.click(retry);

    // Forced lane: the engine runs and the trace appears in the transcript,
    // because the reader asked for a verdict rather than an explanation.
    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      (await within(log).findAllByText("Message Agent")).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the trace and the card on a message that is actually checked", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      (await within(log).findAllByText("Message Agent")).length,
    ).toBeGreaterThan(0);
    expect(
      within(log).queryByText(/Dijawab sebagai pertanyaan/i),
    ).not.toBeInTheDocument();
  });
});

describe("CompanionChat · verdict before voice", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    // The language layer never answers. The deterministic verdict must already
    // be on screen; waiting for the model is a presentation bug, not a check.
    fetchMock.mockImplementation(() => new Promise(() => undefined));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders the score card while the model is still writing", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      await within(log).findByText("File APK via WhatsApp"),
    ).toBeInTheDocument();
    expect(within(log).getByText(/menyusun jawaban/i)).toBeInTheDocument();
  });

  it("announces the settled summary after opening the Agents view mid-run", async () => {
    let resolveReply: (value: unknown) => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReply = resolve;
        }),
    );

    const user = userEvent.setup();
    const { rerender } = render(<CompanionChat />);

    await sendApk(user);
    // The verdict is already on screen; the voice model is still pending.
    await screen.findAllByText("File APK via WhatsApp");

    // Following the /agen link swaps the address; the transcript unmounts.
    mockPathname = "/agen";
    rerender(<CompanionChat />);
    expect(
      screen.getByRole("heading", { name: "Agen pemeriksa" }),
    ).toBeInTheDocument();

    resolveReply({
      ok: false,
      status: 503,
      body: null,
      json: async () => ({ error: "not-configured" }),
    });

    // The transcript is unmounted, so the shell must own this announcement.
    await waitFor(() =>
      expect(screen.getByTestId("run-announcement")).toHaveTextContent(
        /jawaban disusun dari templat/i,
      ),
    );
  });
});

describe("CompanionChat · privacy copy matches the wire", () => {
  it("says the full checked message stays on the device", () => {
    render(<CompanionChat />);

    expect(
      screen.getByText(/isi pesan lengkap.*tidak dikirim/i),
    ).toBeInTheDocument();
  });
});

describe("CompanionChat · a follow-up answers from the verdict it followed", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts the prior verdict's digest on a lanjutan turn", async () => {
    // jsdom has no Response, so the stub exposes only what the clients read.
    const calls: { url: string; body: unknown }[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Promise.resolve({
        ok: false,
        status: 503,
        body: null,
        json: async () => ({ error: "not-configured" }),
      });
    });

    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);

    // The result card is the signal that the check finished and `busy` is back
    // to false, so the follow-up can be sent.
    await screen.findAllByText("File APK via WhatsApp");

    await enterMessage(user, "kenapa berbahaya?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === "/api/companion/answer")).toBe(
        true,
      );
    });

    const answer = calls.find((call) => call.url === "/api/companion/answer");
    const body = answer?.body as {
      lane: string;
      digest: { score: number; risk: string } | null;
    };

    expect(body.lane).toBe("lanjutan");
    expect(body.digest).not.toBeNull();
    expect(typeof body.digest?.score).toBe("number");
    expect(typeof body.digest?.risk).toBe("string");
  });

  it("settles the language stage as skipped when the model returns 503", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        body: null,
        json: async () => ({ error: "not-configured" }),
      }),
    );

    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendApk(user);
    await screen.findAllByText("File APK via WhatsApp");

    const log = await screen.findByRole("log", { name: /percakapan/i });
    const voice = within(log).getByTestId("agent-voice");

    // The row must stop saying "Berjalan" and name the template fallback.
    await waitFor(() =>
      expect(voice).toHaveAttribute("data-status", "dilewati"),
    );
    expect(within(voice).getByText(/templat/i)).toBeInTheDocument();
  });
});

describe("CompanionChat · job search", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    if (realFetch) {
      globalThis.fetch = realFetch;
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
    jest.restoreAllMocks();
  });

  function posting(over: Partial<LokerView> = {}): LokerView {
    return {
      urlKey: "https://example.com/1",
      title: "Frontend Engineer",
      company: "PT Maju",
      location: "Jakarta",
      salaryMin: 10_000_000,
      salaryMax: 15_000_000,
      salaryText: "Rp10-15 jt",
      tags: ["React"],
      description: "Membangun antarmuka React.",
      applyUrl: "https://example.com/1",
      source: "Jobstreet",
      postedAt: "2026-11-01",
      fetchedAt: "2026-11-09T00:00:00.000Z",
      companyEmail: "hr@maju.co.id",
      domainAgeDays: 400,
      employerKnown: true,
      sentinelStatus: "clean",
      sentinelFlags: [],
      trustScore: 100,
      trustLevel: "high",
      luminaScore: 0,
      luminaRisk: "bersih",
      luminaSignals: [],
      ...over,
    };
  }

  const corpus: LokerCorpus = {
    postings: [posting()],
    total: 1,
    capped: false,
  };

  it("renders the card and the summary when the model calls job_search", async () => {
    let answerCalls = 0;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/companion/answer")) {
        answerCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () =>
            answerCalls === 1
              ? {
                  ok: true,
                  text: "",
                  toolCalls: [
                    {
                      id: "call-1",
                      name: "job_search",
                      arguments: { query: "React" },
                    },
                  ],
                }
              : { ok: true, text: "Berikut lowongan React.", toolCalls: [] },
        } as unknown as Response;
      }
      if (url.includes("/api/companion/tools/summary")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, text: "Ada satu lowongan React." }),
        } as unknown as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as unknown as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CompanionChat corpus={corpus} />);
    await enterMessage(user, "cari lowongan React");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(
      await screen.findByText("Ada satu lowongan React."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("agent-job-search")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [, firstAnswer] = fetchMock.mock.calls[0] as unknown as [
      unknown,
      { body?: string },
    ];
    const firstBody = JSON.parse(String(firstAnswer.body)) as {
      observations: unknown[];
      final: boolean;
    };
    expect(firstBody.observations).toEqual([]);
    expect(firstBody.final).toBe(false);

    const [, secondAnswer] = fetchMock.mock.calls[1] as unknown as [
      unknown,
      { body?: string },
    ];
    const secondBody = JSON.parse(String(secondAnswer.body)) as {
      observations: {
        name: string;
        result: { postings: { title: string }[] };
      }[];
    };
    expect(secondBody.observations[0]?.name).toBe("job_search");
    expect(secondBody.observations[0]?.result.postings[0]?.title).toBe(
      "Frontend Engineer",
    );

    // Privacy: the phase-2 summary carries postings, never the user's query.
    const [, summaryInit] = fetchMock.mock.calls[2] as unknown as [
      unknown,
      { body?: string },
    ];
    expect(summaryInit.body).toContain('"postings"');
    expect(summaryInit.body).not.toContain('"query"');
    expect(summaryInit.body).not.toContain("cari lowongan React");
    expect(summaryInit.body).not.toContain('"description"');
  });

  it("opens the card from the chip without calling the model", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<CompanionChat corpus={corpus} />);

    await user.click(screen.getByRole("button", { name: /^cari lowongan$/i }));

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/ada satu lowongan react/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-job-search")).not.toBeInTheDocument();
  });
});

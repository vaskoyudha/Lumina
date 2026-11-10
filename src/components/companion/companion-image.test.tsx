/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";
import * as scoring from "@/lib/scoring/score";

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

jest.mock("next/navigation", () => ({
  usePathname: () => "/companion",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/lib/companion/history", () => ({
  listConversationHistory: jest.fn(async () => ({
    ok: true,
    conversations: [],
  })),
  saveConversationHistory: jest.fn(async () => ({ ok: true })),
}));

/**
 * This suite renders the whole conversation client and drives the vision route
 * plus the deterministic pipeline. The full run executes it beside ~60 other
 * suites on 12 cores, where Jest's 5 s default measures the scheduler rather
 * than the component; 15 s still fails a genuine hang.
 */
jest.setTimeout(15_000);

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  return { __esModule: true, default: MockLink };
});

const TRANSCRIPTION =
  "Undangan pernikahan.apk dari kurir. Instal sekarang sebelum undangan kedaluwarsa.";

function voiceStream(text: string) {
  let sent = false;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: new TextEncoder().encode(text) };
        },
      }),
    },
  };
}

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  jest.mocked(scoring.scoreWithTrace).mockClear();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockImplementation(async (url: string) => {
    const href = String(url);
    if (href === "/api/companion/vision") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, text: TRANSCRIPTION }),
      };
    }
    if (href === "/api/companion/voice") {
      return voiceStream("Jangan buka berkas APK itu.");
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

function uploadedImage(): File {
  return new File([new Uint8Array([137, 80, 78, 71])], "tangkap.png", {
    type: "image/png",
  });
}

describe("CompanionChat · images are read, then scored locally", () => {
  it("transcribes the screenshot and lets the engine name the scheme", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;

    await user.upload(input, uploadedImage());
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText("File APK via WhatsApp").length,
      ).toBeGreaterThan(0);
    });

    const visionCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/companion/vision",
    );
    expect(visionCall).toBeDefined();
    const visionBody = JSON.parse(String(visionCall?.[1]?.body)) as {
      image: { mediaType: string; data: string };
    };
    expect(visionBody.image.mediaType).toBe("image/png");
    expect(visionBody.image.data.length).toBeGreaterThan(0);

    const voiceCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/companion/voice",
    );
    expect(voiceCall).toBeDefined();
    expect(String(voiceCall?.[1]?.body)).not.toContain("Undangan pernikahan");
  });

  it("answers a content question from OCR instead of scoring it as a report", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const href = String(url);
      if (href === "/api/companion/vision") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, text: TRANSCRIPTION }),
        };
      }
      if (href === "/api/companion/answer") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            text: "Gambar ini meminta kamu menginstal berkas APK undangan.",
            toolCalls: [],
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!input) throw new Error("file input missing");

    await user.upload(input, uploadedImage());
    await user.type(
      screen.getByPlaceholderText(/tempel pesan/i),
      "apa isi gambar ini?",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(
      await screen.findByText(/Gambar ini meminta kamu menginstal/i),
    ).toBeInTheDocument();
    expect(scoring.scoreWithTrace).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === "/api/companion/voice",
      ),
    ).toBe(false);

    const answerCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/companion/answer",
    );
    const body = JSON.parse(String(answerCall?.[1]?.body)) as {
      contentQuestion: boolean;
      attachmentContext: { kind: string; text: string }[];
      observations: unknown[];
    };
    expect(body.contentQuestion).toBe(true);
    expect(body.attachmentContext[0]?.kind).toBe("image");
    expect(body.attachmentContext[0]?.text).toContain("Undangan pernikahan");
    expect(JSON.stringify(body)).not.toContain("tangkap.png");
  });

  it("recalls a screenshot when a later turn refers back to it", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const href = String(url);
      if (href === "/api/companion/vision") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, text: TRANSCRIPTION }),
        };
      }
      if (href === "/api/companion/voice") {
        return voiceStream("Jangan buka berkas APK itu.");
      }
      if (href === "/api/companion/answer") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            text: "Dari teks lampiran tadi, berkas itu memang meminta instalasi.",
            toolCalls: [],
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!input) throw new Error("file input missing");

    await user.upload(input, uploadedImage());
    await user.type(
      screen.getByPlaceholderText(/tempel pesan/i),
      "ini aman atau tidak?",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));
    await screen.findByText("Jangan buka berkas APK itu.");

    await user.type(
      screen.getByPlaceholderText(/tempel pesan/i),
      "So basically based on that image it is like some fraud system right",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(
      await screen.findByText(/Dari teks lampiran tadi/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pembaca lampiran")).not.toBeInTheDocument();
    expect(screen.getAllByText("Orkestrator")).toHaveLength(1);

    const answerCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/companion/answer",
    );
    const body = JSON.parse(String(answerCall?.[1]?.body)) as {
      lane: string;
      contentQuestion: boolean;
      attachmentContext: { kind: string; text: string }[];
    };
    expect(body.lane).toBe("tanya");
    expect(body.contentQuestion).toBe(true);
    expect(body.attachmentContext[0]?.kind).toBe("image");
    expect(body.attachmentContext[0]?.text).toContain(
      "Undangan pernikahan.apk",
    );
    expect(JSON.stringify(body)).not.toContain("tangkap.png");
  });

  it("surfaces a failed image read instead of pretending it was checked", async () => {
    // A 503 on the vision route used to be invisible: the turn fell back to the
    // filename, and the reader was never told the pixels were never read.
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url) === "/api/companion/vision") {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: "not-configured" }),
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
    const { container } = render(<CompanionChat />);

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;

    await user.upload(input, uploadedImage());
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(await screen.findByText(/gagal dibaca/i)).toBeInTheDocument();
  });
});

describe("CompanionChat · phone-sized images are normalized before upload", () => {
  const bitmap = {
    width: 3000,
    height: 4000,
    close: jest.fn(),
  };
  let createImageBitmapMock: jest.Mock;
  let getContextSpy: jest.SpyInstance;
  let toBlobSpy: jest.SpyInstance;

  beforeEach(() => {
    createImageBitmapMock = jest.fn(async () => bitmap);
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: createImageBitmapMock,
      configurable: true,
    });
    getContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        fillStyle: "",
        fillRect: jest.fn(),
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D);
    toBlobSpy = jest
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) => {
        callback(
          new Blob([new Uint8Array([255, 216, 255, 224])], {
            type: "image/jpeg",
          }),
        );
      });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "createImageBitmap");
    getContextSpy.mockRestore();
    toBlobSpy.mockRestore();
  });

  it("downscales a large HEIC photo and sends JPEG the route accepts", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) return;

    const big = new Uint8Array(2 * 1024 * 1024);
    const photo = new File([big], "foto-heic.heic", { type: "image/heic" });
    await user.upload(input, photo);
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.find(
          ([url]) => String(url) === "/api/companion/vision",
        ),
      ).toBeDefined();
    });

    const visionCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/companion/vision",
    );
    const visionBody = JSON.parse(String(visionCall?.[1]?.body)) as {
      image: { mediaType: string; data: string };
    };
    expect(createImageBitmapMock).toHaveBeenCalled();
    expect(visionBody.image.mediaType).toBe("image/jpeg");
    expect(visionBody.image.data.length).toBeGreaterThan(0);
  });
});

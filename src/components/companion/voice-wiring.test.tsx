/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";

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

const SCAM =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. Verifikasi di https://bca-verif.xyz/login sekarang.";

/**
 * jsdom has no `Response` or `ReadableStream`, so these are the smallest stubs
 * that expose exactly what `voice-client.ts` reads: `ok`, `body.getReader()`,
 * and `json()`. Using the real classes is not the point of this test — proving
 * the component talks to the route and uses the answer is.
 */
function okResponse(text: string) {
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

function errorResponse(code: string) {
  return {
    ok: false,
    status: 503,
    body: null,
    json: async () => ({ ok: false, error: code }),
  };
}

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function sendScam() {
  const user = userEvent.setup();
  render(<CompanionChat />);
  await user.type(screen.getByLabelText(/pesan/i), SCAM);
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));
}

describe("CompanionChat · the language layer is actually called", () => {
  it("posts the digest and shows the model's words, not the template's", async () => {
    // Words that exist only in the stub, so finding them proves the reply came
    // from the response body rather than from composeReply().
    const MODEL_TEXT =
      "Kalimat ini hanya datang dari model, bukan dari templat.";
    fetchMock.mockResolvedValue(okResponse(MODEL_TEXT));

    await sendScam();

    await waitFor(() => {
      expect(screen.getByText(MODEL_TEXT)).toBeInTheDocument();
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/companion/voice");
    expect(init?.method).toBe("POST");

    // The body is the digest: findings, never the raw message.
    const body = String(init?.body);
    expect(body).toContain("findings");
    expect(body).not.toContain("bca-verif.xyz");
    expect(body).not.toContain("1234567890");
  });

  it("falls back to the template when the model is not configured", async () => {
    fetchMock.mockResolvedValue(errorResponse("not-configured"));

    await sendScam();

    // The template's own sentence, which the model stub above never produces.
    await waitFor(() => {
      expect(
        screen.getByText(/Ini berbahaya\. Jangan bertindak dulu/i),
      ).toBeInTheDocument();
    });
  });

  it("keeps a substantive reply that was cut off instead of swapping it", async () => {
    // Measured: `max_tokens: 220` minus 54-157 reasoning tokens left replies
    // ending mid-word. The reader watched that answer appear and then watched
    // it get replaced by canned copy, which is what "hardcoded" looked like.
    // With a 800-token budget this is rare; when it still happens, the part
    // that was already read stays on screen.
    const PARTIAL =
      "Pesan ini meminta kode OTP lewat tautan yang bukan domain resmi bank, jadi jangan dibalas dulu";
    fetchMock.mockResolvedValue(okResponse(PARTIAL));

    await sendScam();

    await waitFor(() => {
      expect(screen.getByText(PARTIAL)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Ini berbahaya\. Jangan bertindak dulu/i),
    ).not.toBeInTheDocument();
  });

  it("still falls back when the cut leaves almost nothing", async () => {
    fetchMock.mockResolvedValue(okResponse("Pemeriksaan kali"));

    await sendScam();

    await waitFor(() => {
      expect(
        screen.getByText(/Ini berbahaya\. Jangan bertindak dulu/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Pemeriksaan kali")).not.toBeInTheDocument();
  });

  it("says the model was too slow instead of pretending it is unconfigured", async () => {
    fetchMock.mockResolvedValue(errorResponse("upstream-timeout"));

    await sendScam();

    await waitFor(() => {
      expect(screen.getByText(/Model terlalu lambat/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/tidak dikonfigurasi/i)).not.toBeInTheDocument();
  });
});

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

  it("falls back when the model's answer is cut off mid-sentence", async () => {
    // The real failure seen in the browser: a half-sentence rendered as a
    // finished answer. The template is a complete thought; a fragment is not.
    fetchMock.mockResolvedValue(
      okResponse("Pemeriksaan kali ini tidak menemukan indikasi mencurig"),
    );

    await sendScam();

    await waitFor(() => {
      expect(
        screen.getByText(/Ini berbahaya\. Jangan bertindak dulu/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/indikasi mencurig$/)).not.toBeInTheDocument();
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

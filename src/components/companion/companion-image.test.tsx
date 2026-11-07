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
      expect(screen.getByText("File APK via WhatsApp")).toBeInTheDocument();
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
});

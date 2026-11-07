/**
 * @jest-environment jsdom
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Attachment } from "@/components/companion/composer";
import { transcribeImages } from "@/lib/companion/vision-client";

const originalFetch = global.fetch;
type FetchFn = (...args: Parameters<typeof fetch>) => Promise<unknown>;
let fetchMock: jest.Mock<FetchFn>;

function imageAttachment(): Attachment {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "bukti.png", {
    type: "image/png",
  });
  return {
    id: "att-1",
    name: "bukti.png",
    size: file.size,
    type: "image/png",
    url: "blob:test/1",
    file,
  };
}

beforeEach(() => {
  fetchMock = jest.fn<FetchFn>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("transcribeImages", () => {
  it("returns nothing when the turn carries no image", async () => {
    const result = await transcribeImages([]);
    expect(result).toEqual({ text: "", attempted: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the image and labels the transcription with its filename", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: "Transfer ke 081234567890" }),
    });

    const result = await transcribeImages([imageAttachment()]);

    expect(result.attempted).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.text).toContain("[bukti.png]");
    expect(result.text).toContain("Transfer ke 081234567890");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/companion/vision");
    const body = JSON.parse(String(init.body)) as {
      image: { mediaType: string; data: string };
    };
    expect(body.image.mediaType).toBe("image/png");
    expect(body.image.data.length).toBeGreaterThan(0);
  });

  it("degrades to a failed read instead of throwing", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, error: "upstream-failed" }),
    });

    const result = await transcribeImages([imageAttachment()]);
    expect(result).toEqual({ text: "", attempted: 1, failed: 1 });
  });
});

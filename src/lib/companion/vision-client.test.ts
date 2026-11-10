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
import {
  IMAGE_READ_TIMEOUT_MS,
  transcribeImages,
} from "@/lib/companion/vision-client";

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
    expect(result).toEqual({ text: "", attempted: 0, failed: 0, skipped: 0 });
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
    expect(result).toEqual({ text: "", attempted: 1, failed: 1, skipped: 0 });
  });
  it("reports a FileReader exception as a failed read", async () => {
    const read = jest
      .spyOn(FileReader.prototype, "readAsDataURL")
      .mockImplementation(() => {
        throw new Error("unreadable");
      });
    try {
      await expect(
        transcribeImages([imageAttachment()]),
      ).resolves.toMatchObject({ attempted: 1, failed: 1 });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  });
  it("counts images beyond the limit as skipped", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: "Pesan pada gambar" }),
    });
    const result = await transcribeImages(
      Array.from({ length: 4 }, imageAttachment),
    );
    expect(result).toMatchObject({ attempted: 3, failed: 0, skipped: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("aborts a stalled image upload and releases the caller", async () => {
    const read = jest
      .spyOn(FileReader.prototype, "readAsDataURL")
      .mockImplementation(function (this: FileReader) {
        Object.defineProperty(this, "result", {
          value: "data:image/png;base64,abcdefghijklmnop",
        });
        this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
      });
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    try {
      const pending = transcribeImages([imageAttachment()]);
      await jest.advanceTimersByTimeAsync(IMAGE_READ_TIMEOUT_MS);
      await expect(pending).resolves.toMatchObject({ attempted: 1, failed: 1 });
    } finally {
      jest.useRealTimers();
      read.mockRestore();
    }
  });
});

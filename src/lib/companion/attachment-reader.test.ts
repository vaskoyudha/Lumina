/**
 * @jest-environment jsdom
 */
import type { Attachment } from "@/components/companion/composer";
import {
  attachmentContext,
  attachmentKind,
  describeReads,
  readAttachments,
} from "@/lib/companion/attachment-reader";
import type { ImageTranscription } from "@/lib/companion/vision-client";

function attachment(
  name: string,
  type: string,
  contents: string | Uint8Array = "isi berkas",
): Attachment {
  const blobPart: BlobPart =
    typeof contents === "string" ? contents : new Uint8Array(contents).buffer;
  const file = new File([blobPart], name, { type });
  return {
    id: name,
    name,
    size: file.size,
    type,
    url: `blob:test/${name}`,
    file,
  };
}

function transcription(
  items: { id: string; name: string; text: string }[] = [],
): ImageTranscription {
  return {
    text: items.map((item) => `[${item.name}]\n${item.text}`).join("\n\n"),
    attempted: items.length,
    failed: 0,
    skipped: 0,
    items,
  };
}

describe("attachment reader", () => {
  it("classifies images, PDFs, text and unknown files by type and extension", () => {
    expect(attachmentKind(attachment("bukti.png", "image/png"))).toBe("image");
    expect(attachmentKind(attachment("materi.pdf", "application/pdf"))).toBe(
      "pdf",
    );
    expect(attachmentKind(attachment("catatan.txt", "text/plain"))).toBe(
      "text",
    );
    expect(
      attachmentKind(attachment("data.bin", "application/octet-stream")),
    ).toBe("other");
  });

  it("reads a text file locally and keeps its name out of the model context", async () => {
    const result = await readAttachments(
      [attachment("catatan.txt", "text/plain", "Kode undangan: RAHASIA-42")],
      transcription(),
    );

    expect(result.readable).toBe(1);
    expect(result.text).toContain("RAHASIA-42");
    const context = attachmentContext(result.reads);
    expect(context).toEqual([
      { kind: "text", text: "Kode undangan: RAHASIA-42" },
    ]);
    expect(JSON.stringify(context)).not.toContain("catatan.txt");
  });

  it("uses the image transcription and never re-reads the pixels", async () => {
    const image = attachment("bukti.png", "image/png");
    const result = await readAttachments(
      [image],
      transcription([
        { id: "bukti.png", name: "bukti.png", text: "Transfer ke 0812" },
      ]),
    );

    expect(result.readable).toBe(1);
    expect(result.text).toContain("[bukti.png]");
    expect(result.text).toContain("Transfer ke 0812");
    expect(attachmentContext(result.reads)).toEqual([
      { kind: "image", text: "Transfer ke 0812" },
    ]);
  });

  it("reports a PDF as unsupported instead of pretending to read it", async () => {
    const result = await readAttachments(
      [attachment("materi.pdf", "application/pdf", "%PDF-not-really")],
      transcription(),
    );

    expect(result.readable).toBe(0);
    expect(result.unsupported).toBe(1);
    expect(attachmentContext(result.reads)).toEqual([]);
    expect(describeReads(result)).toMatch(/Teks PDF belum bisa dibaca/i);
  });

  it("caps the model context and drops names from attachment text", async () => {
    const result = await readAttachments(
      [
        attachment("a.txt", "text/plain", "a".repeat(5000)),
        attachment("b.txt", "text/plain", "b".repeat(5000)),
      ],
      transcription(),
    );
    const context = attachmentContext(result.reads);
    expect(context.length).toBe(2);
    expect(context.every((part) => part.kind === "text")).toBe(true);
    expect(JSON.stringify(context)).not.toContain("a.txt");
    expect(JSON.stringify(context)).not.toContain("b.txt");
  });
});

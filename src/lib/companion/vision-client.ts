import {
  type Attachment,
  isImageAttachment,
} from "@/components/companion/composer";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;
export const IMAGE_READ_TIMEOUT_MS = 23000;

export interface ImageTranscription {
  text: string;
  attempted: number;
  failed: number;
  skipped: number;
}

interface ImagePayload {
  mediaType: string;
  data: string;
}

function readImage(
  file: File,
  signal: AbortSignal,
): Promise<ImagePayload | null> {
  if (signal.aborted || file.size === 0 || file.size > MAX_BYTES)
    return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    const finish = (result: ImagePayload | null) => {
      signal.removeEventListener("abort", abort);
      reader.onload = reader.onerror = reader.onabort = null;
      resolve(result);
    };
    const abort = () => {
      finish(null);
      reader.abort();
    };
    signal.addEventListener("abort", abort, { once: true });
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      if (comma < 0) {
        finish(null);
        return;
      }
      const header = result.slice(0, comma);
      const rawType = header.slice(5, header.indexOf(";")) || file.type;
      const mediaType = rawType === "image/jpg" ? "image/jpeg" : rawType;
      finish({
        mediaType,
        data: result.slice(comma + 1),
      });
    };
    reader.onerror = reader.onabort = () => finish(null);
    try {
      reader.readAsDataURL(file);
    } catch {
      finish(null);
    }
  });
}

async function transcribeOne(
  attachment: Attachment,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const image = await readImage(attachment.file, signal);
    if (!image || signal.aborted) return null;
    const response = await fetch("/api/companion/vision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      ok?: boolean;
      text?: unknown;
    };
    if (!payload.ok || typeof payload.text !== "string") return null;

    const text = payload.text.trim();
    if (text.length === 0) return null;
    return `[${attachment.name}]\n${text}`;
  } catch {
    return null;
  }
}

/**
 * Read the images attached to one turn, in parallel, and return their visible
 * text. A failure is a null result, never a thrown error: an unreadable image
 * must degrade to the filename-only check rather than break the turn.
 */
export async function transcribeImages(
  attachments: readonly Attachment[],
  signal?: AbortSignal,
): Promise<ImageTranscription> {
  const allImages = attachments.filter(isImageAttachment);
  const images = allImages.slice(0, MAX_IMAGES);

  if (images.length === 0) {
    return { text: "", attempted: 0, failed: 0, skipped: 0 };
  }

  const control = new AbortController();
  const abort = () => control.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, IMAGE_READ_TIMEOUT_MS);
  let results: (string | null)[];
  try {
    results = await Promise.all(
      images.map((attachment) => transcribeOne(attachment, control.signal)),
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
  const text = results
    .filter((part): part is string => part !== null)
    .join("\n\n");

  return {
    text,
    attempted: images.length,
    failed: results.filter((part) => part === null).length,
    skipped: allImages.length - images.length,
  };
}

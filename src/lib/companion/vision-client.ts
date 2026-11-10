import {
  type Attachment,
  isImageAttachment,
} from "@/components/companion/composer";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;
/**
 * Must stay above the vision route's 45 s upstream deadline; otherwise the
 * client aborts a read the server would have finished. 5 s covers the network
 * hop on top of the route's own budget.
 */
export const IMAGE_READ_TIMEOUT_MS = 50000;
/**
 * Longest side sent upstream. Phone photos arrive at 3000–4000 px and several
 * megabytes; the model already reads a 1600 px copy, and the smaller payload
 * keeps transcription inside both timeouts.
 */
const MAX_SIDE = 1600;
/** Above this, re-encode even a supported type: the upstream is slow on big payloads. */
const RECODE_ABOVE_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITY = 0.9;
/** The route's contract (`VISION_MEDIA_TYPES`); anything else is transcoded. */
const SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

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

function normalizeMediaType(raw: string, fallback: string): string {
  const type = (raw || fallback || "").toLowerCase();
  return type === "image/jpg" ? "image/jpeg" : type;
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
      finish({
        mediaType: normalizeMediaType(rawType, file.type),
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

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = reader.onabort = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscale and re-encode before upload.
 *
 * A screenshot from a phone is often 3–5 MB at 3000+ px. Sent as-is it either
 * times out the vision route or makes the upstream return an empty
 * transcription, so the turn degrades to a filename-only check. Drawing it to a
 * 1600 px JPEG keeps the text legible while cutting the payload by an order of
 * magnitude, and it also transcodes formats the route does not accept (HEIC,
 * AVIF) when the browser can decode them.
 */
async function normalizeImage(
  file: File,
  signal: AbortSignal,
): Promise<ImagePayload | null> {
  if (signal.aborted || file.size === 0) return null;
  if (typeof createImageBitmap !== "function") return readImage(file, signal);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The browser cannot decode this format (for example HEIC in Chrome);
    // fall back to the raw payload so the route's own error stays visible.
    return readImage(file, signal);
  }

  try {
    if (signal.aborted) return null;
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
    const alreadySmall =
      scale === 1 &&
      file.size <= RECODE_ABOVE_BYTES &&
      SUPPORTED_TYPES.has(file.type);
    if (alreadySmall) return readImage(file, signal);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return readImage(file, signal);

    // JPEG has no alpha; paint white so a transparent PNG does not go black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || signal.aborted) return null;

    const dataUrl = await blobToDataUrl(blob);
    const comma = dataUrl ? dataUrl.indexOf(",") : -1;
    if (!dataUrl || comma < 0 || signal.aborted) return null;

    return { mediaType: "image/jpeg", data: dataUrl.slice(comma + 1) };
  } finally {
    bitmap.close?.();
  }
}

async function transcribeOne(
  attachment: Attachment,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const image = await normalizeImage(attachment.file, signal);
    if (!image || signal.aborted) return null;
    if (!SUPPORTED_TYPES.has(image.mediaType)) return null;
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

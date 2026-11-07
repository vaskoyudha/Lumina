import {
  type Attachment,
  isImageAttachment,
} from "@/components/companion/composer";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;

export interface ImageTranscription {
  text: string;
  attempted: number;
  failed: number;
}

interface ImagePayload {
  mediaType: string;
  data: string;
}

function readImage(file: File): Promise<ImagePayload | null> {
  if (file.size === 0 || file.size > MAX_BYTES) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      if (comma < 0) {
        resolve(null);
        return;
      }
      const header = result.slice(0, comma);
      const rawType = header.slice(5, header.indexOf(";")) || file.type;
      const mediaType = rawType === "image/jpg" ? "image/jpeg" : rawType;
      resolve({
        mediaType,
        data: result.slice(comma + 1),
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function transcribeOne(
  attachment: Attachment,
  signal?: AbortSignal,
): Promise<string | null> {
  const image = await readImage(attachment.file);
  if (!image) return null;

  try {
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
  const images = attachments.filter(isImageAttachment).slice(0, MAX_IMAGES);

  if (images.length === 0) {
    return { text: "", attempted: 0, failed: 0 };
  }

  const results = await Promise.all(
    images.map((attachment) => transcribeOne(attachment, signal)),
  );
  const text = results
    .filter((part): part is string => part !== null)
    .join("\n\n");

  return {
    text,
    attempted: images.length,
    failed: results.filter((part) => part === null).length,
  };
}

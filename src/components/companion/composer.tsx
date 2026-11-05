"use client";

import { ArrowUp, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Composer — the chat input, structured after the reference chat UI surveyed in
 * `lumina-references/` (attachment strip → textarea → toolbar → circular send),
 * rebuilt on this project's primitives.
 *
 * What was taken from the reference, because it is a real capability and not
 * decoration:
 *   a. An attachment strip above the field, with image thumbnails and file
 *      chips, each removable.
 *   b. Three ways to attach, because that is how people actually share a scam
 *      message: the picker, paste (a screenshot on the clipboard), and
 *      drag-and-drop onto the field.
 *   c. A toolbar under the text and a single circular send button, so the
 *      primary action sits where the eye ends.
 *
 * What was NOT taken: the reference sends images to a model that reads them.
 * This engine is deterministic and offline, so an image's pixels are never
 * read. Claiming otherwise would be a lie in the one place this product cannot
 * afford one. Instead the *filename* is folded into what gets scored — which is
 * genuinely useful, because `undangan-nikah.apk` is the strongest signal in the
 * APK family — and the helper line says plainly that image contents are not
 * read yet.
 *
 * Attachments never leave the device: they are `URL.createObjectURL` handles
 * over `File` objects that stay in memory, which is what keeps the privacy
 * promise in the plan (§11.6) true rather than aspirational.
 */

export interface Attachment {
  id: string;
  name: string;
  size: number;
  /** MIME type as reported by the browser. */
  type: string;
  /** `blob:` URL, revoked when the attachment is removed or the composer dies. */
  url: string;
}

export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.type.startsWith("image/");
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The filenames are part of what the user received, so they belong in the text
 * that gets scored. Kept separate from the visible message: the bubble shows
 * the attachment chip, not a fabricated sentence.
 */
export function scoringTextWithAttachments(
  text: string,
  attachments: readonly Attachment[],
): string {
  if (attachments.length === 0) return text;
  return [text, ...attachments.map((a) => a.name)].filter(Boolean).join(" ");
}

let sequence = 0;

function toAttachment(file: File): Attachment {
  sequence += 1;
  return {
    id: `att-${Date.now()}-${sequence}`,
    name: file.name || `tempelan-${sequence}`,
    size: file.size,
    type: file.type || "application/octet-stream",
    url: URL.createObjectURL(file),
  };
}

export function Composer({
  onSubmit,
  busy = false,
  placeholder = "Tempel pesan atau tulis pertanyaanmu…",
  submitLabel = "Kirim",
  autoFocus = false,
  className,
}: {
  /** Called with the typed text and the attachments for this turn. */
  onSubmit: (text: string, attachments: Attachment[]) => void;
  busy?: boolean;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  /**
   * Object URLs are only created inside event handlers, never during render:
   * reading the clock or minting a URL while rendering breaks the prerender of
   * a Client Component under Next 16 (this project has hit that twice).
   */

  const addFiles = React.useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const next = Array.from(files).map(toAttachment);
    if (next.length === 0) return;
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => {
      const hit = prev.find((a) => a.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Revoke whatever is still held when the composer unmounts, so a long
  // session cannot leak blobs.
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;
  React.useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.url);
      }
    },
    [],
  );

  const submit = React.useCallback(() => {
    const text = draft.trim();
    if (busy) return;
    if (text.length === 0 && attachments.length === 0) return;

    onSubmit(text, attachments);
    setDraft("");
    setAttachments((prev) => {
      for (const attachment of prev) URL.revokeObjectURL(attachment.url);
      return [];
    });
    textareaRef.current?.focus();
  }, [attachments, busy, draft, onSubmit]);

  const canSend = draft.trim().length > 0 || attachments.length > 0;

  return (
    <div className={cn("w-full", className)}>
      {attachments.length > 0 ? (
        <ul
          className="mb-2 flex flex-wrap gap-2"
          aria-label="Lampiran yang akan dikirim"
        >
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="relative overflow-hidden rounded-sm border border-line bg-panel-2"
            >
              {isImageAttachment(attachment) ? (
                <div className="size-[112px]">
                  {/* biome-ignore lint/performance/noImgElement: a blob: URL from a local File cannot go through next/image */}
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="size-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex max-w-[180px] items-center gap-2 px-2.5 py-2">
                  <Paperclip aria-hidden className="size-4 shrink-0 text-dim" />
                  <span className="min-w-0">
                    <span className="block truncate text-txt text-xs">
                      {attachment.name}
                    </span>
                    <span className="tabular block text-[0.65rem] text-dim">
                      {formatAttachmentSize(attachment.size)}
                    </span>
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAttachment(attachment.id)}
                aria-label={`Hapus lampiran ${attachment.name}`}
                className="absolute top-1 right-1 size-6 rounded-full border border-line bg-panel/90 text-dim hover:text-txt"
              >
                <X aria-hidden className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        Drag-and-drop lands on the field itself, not the whole page: dropping a
        file anywhere else should keep the browser's default behaviour. It is a
        pointer shortcut, not a control — the attach button is the keyboard and
        screen-reader path — so the element carries no role.
      */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-only shortcut; the attach button is the accessible path */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-md border bg-panel p-2.5 shadow-rest transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          dragging
            ? "border-txt bg-panel-2"
            : "border-field focus-within:border-txt focus-within:shadow-lift",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-label="Lampirkan gambar atau berkas"
          onChange={(event) => {
            addFiles(event.target.files);
            // Allow re-picking the same file after a removal.
            event.target.value = "";
          }}
        />

        <Textarea
          ref={textareaRef}
          value={draft}
          autoFocus={autoFocus}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          onPaste={(event) => {
            // A pasted screenshot is the single most common way a scam arrives
            // in a chat, so paste must attach, not dump a filename.
            const files = Array.from(event.clipboardData.files);
            if (files.length > 0) {
              event.preventDefault();
              addFiles(files);
            }
          }}
          rows={2}
          placeholder={placeholder}
          aria-label="Pesan"
          className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />

        <div className="mt-2 flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => inputRef.current?.click()}
            aria-label="Lampirkan gambar atau berkas"
            className="size-8 rounded-full text-dim hover:text-txt"
          >
            <ImageIcon aria-hidden className="size-4" />
          </Button>

          <span className="hidden text-dim text-xs sm:inline">
            Enter mengirim · Shift+Enter baris baru
          </span>

          <Button
            type="button"
            onClick={submit}
            disabled={busy || !canSend}
            aria-label={submitLabel}
            className="ml-auto size-8 shrink-0 rounded-full p-0"
          >
            {busy ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <ArrowUp aria-hidden className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-2 text-[0.7rem] text-dim leading-snug">
        Lampiran tidak diunggah ke mana pun. Nama berkas ikut diperiksa; isi
        gambar belum bisa dibaca.
      </p>
    </div>
  );
}

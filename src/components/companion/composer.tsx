"use client";

import {
  ArrowUp,
  Briefcase,
  ImageIcon,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Composer — the chat input, structured after the Cortex reference chat UI.
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
 * Surface: the reference wraps the white field in a tinted card with a 5px
 * gutter, a brand hairline and a brand gradient send orb. Reproduced with the
 * documented `--lumina-brand*` tokens; the shell is the same object the
 * reference draws, not an outline around one.
 *
 * Images are read: the original `File` is kept, the chat asks
 * `/api/companion/vision` for a transcription, and that transcription joins the
 * text that gets scored. The model transcribes, it never judges — `score.ts`
 * remains the only source of `score`, `risk`, and `signals`. The transfer is
 * disclosed permanently under the field rather than in a one-time dialog
 * (plan §11.6a).
 *
 * Filenames are still folded into what gets scored, because
 * `undangan-nikah.apk` is the strongest signal in the APK family. Non-image
 * files keep their `blob:` handle in memory; nothing is stored.
 */

export interface Attachment {
  id: string;
  name: string;
  size: number;
  /** MIME type as reported by the browser. */
  type: string;
  /** `blob:` URL, revoked when the attachment is removed or the composer dies. */
  url: string;
  /** Original file, kept so an image can be transcribed before scoring. */
  file: File;
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
    file,
  };
}

export function Composer({
  onSubmit,
  busy = false,
  placeholder = "Tempel pesan atau tulis pertanyaanmu…",
  submitLabel = "Kirim",
  autoFocus = false,
  className,
  initialDraft = "",
  onSearchJobs,
}: {
  /** Called with the typed text and the attachments for this turn. */
  onSubmit: (text: string, attachments: Attachment[]) => void;
  busy?: boolean;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  className?: string;
  /** Seeds the field once; remount the composer (a `key`) to seed it again. */
  initialDraft?: string;
  /** Opens the job-search card with no query; no model call. */
  onSearchJobs?: () => void;
}) {
  const [draft, setDraft] = React.useState(initialDraft);
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
          className="mb-2 flex flex-wrap items-center gap-1.5"
          aria-label="Lampiran yang akan dikirim"
        >
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="relative overflow-hidden rounded-[10px] border border-brand-line bg-brand-soft"
            >
              {isImageAttachment(attachment) ? (
                <span className="block size-[62px]">
                  {/* biome-ignore lint/performance/noImgElement: a blob: URL from a local File cannot go through next/image */}
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="size-full object-cover"
                  />
                </span>
              ) : (
                <span className="inline-flex max-w-[180px] items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-brand-ink">
                  <Paperclip
                    aria-hidden
                    strokeWidth={1.6}
                    className="size-3 shrink-0"
                  />
                  <span className="min-w-0 truncate">{attachment.name}</span>
                </span>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAttachment(attachment.id)}
                aria-label={`Hapus lampiran ${attachment.name}`}
                className="absolute top-0.5 right-0.5 size-5 rounded-full bg-panel/90 text-ink-mute hover:text-ink"
              >
                <X aria-hidden strokeWidth={2.2} className="size-2.5" />
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
          "w-full rounded-[18px] border p-[5px] transition-[border-color,background-color,box-shadow] duration-150 ease-out",
          dragging
            ? "border-brand-strong bg-brand-soft"
            : "border-brand-line bg-brand-tint shadow-[0_4px_24px_color-mix(in_oklab,var(--lumina-brand-glow)_8%,transparent)] focus-within:border-brand-glow",
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

        <div className="rounded-[14px] border border-brand-line/70 bg-panel px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_color-mix(in_oklab,var(--lumina-txt)_3%,transparent)]">
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
            className="mb-1.5 min-h-[41px] resize-none border-0 bg-transparent px-0 py-0 font-normal text-[16px] text-ink leading-relaxed tracking-normal shadow-none placeholder:text-ink-faint focus-visible:ring-0 sm:text-[12.5px]"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => inputRef.current?.click()}
                aria-label="Lampirkan gambar atau berkas"
                className="size-11 shrink-0 rounded-[8px] border border-transparent bg-chip text-ink-mute hover:bg-chip-hover hover:text-ink sm:size-[29px]"
              >
                <ImageIcon aria-hidden strokeWidth={1.6} className="size-3.5" />
              </Button>

              {onSearchJobs ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSearchJobs}
                  aria-label="Cari lowongan"
                  className="h-11 shrink-0 rounded-[8px] border border-transparent bg-chip px-2.5 text-ink-mute text-[11px] hover:bg-chip-hover hover:text-ink sm:h-[29px]"
                >
                  <Briefcase
                    aria-hidden
                    strokeWidth={1.6}
                    className="size-3.5"
                  />
                  <span className="hidden sm:inline">Cari lowongan</span>
                  <span className="sm:hidden">Cari</span>
                </Button>
              ) : null}

              <span className="hidden truncate text-[10.5px] text-ink-faint sm:inline">
                Enter mengirim · Shift+Enter baris baru
              </span>
            </div>

            <Button
              type="button"
              onClick={submit}
              disabled={busy || !canSend}
              aria-label={submitLabel}
              className="size-11 shrink-0 rounded-full bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong p-0 text-white ring-2 ring-brand-line shadow-[0_2px_8px_color-mix(in_oklab,var(--lumina-brand-glow)_45%,transparent)] hover:brightness-[1.03] disabled:opacity-40 sm:size-[30px]"
            >
              {busy ? (
                <Loader2
                  aria-hidden
                  strokeWidth={2}
                  className="size-[15px] animate-spin"
                />
              ) : (
                <ArrowUp
                  aria-hidden
                  strokeWidth={2.2}
                  className="size-[15px]"
                />
              )}
            </Button>
          </div>
        </div>

        {/*
          The reference's sub-bar under the field. Both halves are real: the
          left reads the clipboard (people copy a scam message before opening
          this page), the right opens the same file picker as the toolbar.
        */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            type="button"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text.trim().length > 0) {
                  setDraft(text);
                  textareaRef.current?.focus();
                  return;
                }
              } catch {
                // Permission denied or no clipboard API — the textarea is
                // still the path, so fall through and focus it.
              }
              textareaRef.current?.focus();
            }}
            className="flex min-h-11 items-center gap-1.5 text-left font-semibold text-[11.5px] text-ink-soft transition-colors hover:text-brand-chip-ink sm:min-h-0"
          >
            <Sparkles
              aria-hidden
              strokeWidth={1.8}
              className="size-3.5 text-brand-ink-soft"
            />
            Tempel dari papan klip
          </button>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-11 items-center gap-1.5 rounded-full border border-brand-line bg-panel px-2.5 text-[11px] font-medium text-ink-soft shadow-rest transition-colors hover:bg-brand-tint sm:h-[24px]"
          >
            <Paperclip
              aria-hidden
              strokeWidth={1.8}
              className="size-3 -rotate-45 text-ink-mute"
            />
            Lampirkan berkas
          </button>
        </div>
      </div>

      {/* Plan §11.6: the notice stays in the DOM for assistive tech only. */}
      <p className="sr-only">
        Isi pesan lengkap yang diperiksa tidak dikirim: pemeriksaan berjalan di
        perangkat ini. Pertanyaan, riwayat obrolan yang tidak diperiksa, dan
        ringkasan temuan tanpa kutipan dapat dikirim ke layanan AI. Gambar
        lampiran dikirim untuk disalin teksnya. Isi percakapan tidak disimpan di
        server; akun hanya menyimpan label topik, waktu, jumlah giliran, dan
        tingkat risiko terakhir.
      </p>
    </div>
  );
}

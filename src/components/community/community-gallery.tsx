"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Post image gallery for the feed and the thread.
 *
 * Feed tiles are buttons, not links: the surrounding card already owns the
 * route to the thread, and a cover must open the viewer instead of navigating.
 * The viewer is a modal because it has to work from the feed, the thread, and a
 * keyboard; Escape closes it and arrow keys walk the gallery, so a post with
 * several uploaded covers is fully browsable.
 *
 * Images are seed/demo files under /images/community. The editor still accepts
 * no uploads, so this only renders what the database already stores.
 */
export function PostImages({
  images,
  priority = false,
  testId = "post-image",
  className,
}: {
  images: string[];
  priority?: boolean;
  testId?: string;
  className?: string;
}) {
  const [preview, setPreview] = useState<number | null>(null);

  if (!images.length) return null;

  const tiles = images.slice(0, 4);
  const extra = images.length - tiles.length;
  const index = preview ?? 0;
  const open = preview !== null;
  const step = (delta: number) =>
    setPreview((current) => {
      const next = (current ?? 0) + delta;
      return (next + images.length) % images.length;
    });

  return (
    <>
      <div
        data-testid={testId}
        className={cn(
          "mt-3 grid gap-1.5",
          tiles.length > 1 ? "grid-cols-2" : "grid-cols-1",
          className,
        )}
      >
        {tiles.map((src, tile) => (
          <button
            key={src}
            type="button"
            onClick={() => setPreview(tile)}
            aria-label={
              images.length > 1
                ? `Buka pratinjau gambar ${tile + 1} dari ${images.length}`
                : "Buka pratinjau gambar"
            }
            className={cn(
              "group relative z-10 overflow-hidden rounded-2xl border border-line bg-panel-2 outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50",
              tiles.length > 1 && tile === 0 && tiles.length % 2 === 1
                ? "col-span-2 aspect-[16/9]"
                : "aspect-[4/3]",
            )}
          >
            <Image
              src={src}
              alt=""
              fill
              loading={priority && tile === 0 ? "eager" : "lazy"}
              sizes="(max-width: 640px) 100vw, 720px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            {tile === 0 && extra > 0 ? (
              <span className="absolute right-2 bottom-2 rounded-full bg-txt/75 px-2 py-0.5 text-[11px] font-semibold text-bg">
                +{extra} gambar
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) setPreview(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col p-3 text-white outline-none sm:p-6"
            onClick={(event) => {
              if (event.target === event.currentTarget) setPreview(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                step(1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                step(-1);
              }
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              Pratinjau gambar
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {images.length > 1
                ? "Gunakan tombol panah kiri dan kanan untuk berpindah gambar, lalu Escape untuk menutup."
                : "Tekan Escape untuk menutup pratinjau."}
            </DialogPrimitive.Description>

            <div className="flex items-center justify-between">
              {images.length > 1 ? (
                <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums">
                  {index + 1} / {images.length}
                </p>
              ) : (
                <span />
              )}
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tutup pratinjau"
                  className="size-11 rounded-full text-white hover:bg-white/15 hover:text-white"
                >
                  <X aria-hidden />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <div className="relative mt-2 flex min-h-0 flex-1 items-center justify-center">
              <div className="relative h-full w-full max-w-5xl">
                <Image
                  src={images[index]}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-contain"
                />
              </div>
              {images.length > 1 ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Gambar sebelumnya"
                    onClick={() => step(-1)}
                    className="absolute left-0 size-12 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Gambar berikutnya"
                    onClick={() => step(1)}
                    className="absolute right-0 size-12 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {images.map((src, thumb) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPreview(thumb)}
                    aria-label={`Lihat gambar ${thumb + 1}`}
                    aria-current={thumb === index ? "true" : undefined}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity",
                      thumb === index
                        ? "border-white"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

import { cn } from "@/lib/utils";

/**
 * The animated Lumina mascot (sprite-sheet v1).
 *
 * The APNG keeps full alpha and every frame; `next/image` would flatten it to a
 * still. A static first frame takes over under `prefers-reduced-motion`, and the
 * mark is decorative — the heading beside it carries the meaning.
 *
 * `effect` adds the ambient layer used on the companion empty state: a
 * breathing brand halo, a blurred bloom of the mascot itself, and a slow float.
 * It is opt-in so the marketing print of the same surface stays a still.
 */
export function Mascot({
  className,
  effect = false,
}: {
  className?: string;
  effect?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block",
        effect && "mascot-float",
        className,
      )}
    >
      {effect ? (
        <span className="pointer-events-none absolute inset-0">
          <span className="mascot-halo absolute top-1/2 left-1/2 size-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-2xl" />
          {/* biome-ignore lint/performance/noImgElement: a static blurred bloom of the mascot; next/image adds no value here */}
          <img
            alt=""
            className="mascot-bloom absolute inset-0 h-full w-full scale-105 object-contain opacity-40 blur-md saturate-150"
            draggable={false}
            height={152}
            loading="lazy"
            src="/brand/mascot/mascot-v1.png"
            width={208}
          />
        </span>
      ) : null}
      {/* biome-ignore lint/performance/noImgElement: an APNG cannot pass through next/image without losing its frames */}
      <img
        alt=""
        className="relative h-full w-full object-contain motion-reduce:hidden"
        draggable={false}
        height={152}
        loading="lazy"
        src="/brand/mascot/mascot-v1.apng"
        width={208}
      />
      {/* biome-ignore lint/performance/noImgElement: static fallback for prefers-reduced-motion */}
      <img
        alt=""
        className="relative hidden h-full w-full object-contain motion-reduce:block"
        draggable={false}
        height={152}
        loading="lazy"
        src="/brand/mascot/mascot-v1.png"
        width={208}
      />
    </span>
  );
}

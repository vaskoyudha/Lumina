import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { SURFACE_SUBCARD } from "@/components/simulasi/surface";
import { cn } from "@/lib/utils";

export type LevelEntry = {
  id: string;
  title: string;
  note: string;
  image: string;
  href?: string;
};

/**
 * Level picker for the simulation rail: one row per level with a thumbnail,
 * heading and note. A level with `href` is playable; a level without one is
 * still a plan, so it renders as a locked row rather than a dead button.
 */
export function LevelPicker({
  available,
  planned,
}: {
  available: LevelEntry[];
  planned: LevelEntry[];
}) {
  return (
    <section
      aria-labelledby="level-picker-heading"
      className={cn(SURFACE_SUBCARD, "p-3.5")}
    >
      <div className="flex items-center justify-between gap-2 border-[#efe5dc] border-b pb-1.5">
        <h2
          id="level-picker-heading"
          className="font-extrabold text-[10.5px] text-[#1e1c1a]"
        >
          Level simulasi
        </h2>
        <span className="font-bold text-[9px] text-[#8a8077]">
          {available.length} siap
        </span>
      </div>

      <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
        {available.map((level) => (
          <li key={level.id}>
            <Link
              href={level.href ?? `/simulasi/${level.id}`}
              className="group flex items-center gap-2.5 rounded-[12px] border border-[#f3e6dc] bg-[linear-gradient(180deg,#ffffff_0%,#fdf9f6_100%)] p-1.5 transition hover:border-[#f5decb] hover:brightness-[0.99]"
            >
              <LevelThumb image={level.image} />
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-[10.5px] text-[#1e1c1a] leading-tight">
                  {level.title}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-[#8a8077]">
                  {level.note}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-[#e65c00] transition group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}

        {planned.map((level) => (
          <li key={level.id}>
            <div className="flex items-center gap-2.5 rounded-[12px] border border-[#f0e5dc] bg-[#fdfaf7] p-1.5">
              <LevelThumb image={level.image} locked />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[10.5px] text-[#6c615a] leading-tight">
                  {level.title}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-[#a1968d]">
                  {level.note}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f1e8e0] px-1.5 py-0.5 font-bold text-[8px] text-[#8a8077]">
                <Lock aria-hidden="true" className="size-2.5" />
                Rencana
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LevelThumb({ image, locked }: { image: string; locked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block h-11 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[#f3e6dc] bg-[#fdf3ec] bg-center bg-cover",
        locked && "grayscale-[0.85] opacity-70",
      )}
      style={{ backgroundImage: `url('${image}')` }}
    >
      {locked && (
        <span className="absolute inset-0 grid place-items-center bg-[#231e1b]/25 text-white">
          <Lock className="size-3" />
        </span>
      )}
    </span>
  );
}

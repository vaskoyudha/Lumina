"use client";

import { motion, useReducedMotion } from "motion/react";
import * as React from "react";

/**
 * Fanned card stack — mechanism cloned from cards-folder.framer.website,
 * measured rather than guessed:
 *
 *   rest        cards overlap almost fully; only an edge peeks (like a folder)
 *   hover       the fan opens — cards rise and pivot apart around a shared
 *               bottom origin, settling with a spring (~0.5s, reversible)
 *   pointer     spread is UNIFORM, not cursor-following (two different hover
 *               positions produced a 1e-5 image diff)
 *   outside     hovering below the cards did nothing (diff ~0 vs rest), so the
 *               trigger is per-stack, not per-pixel
 *
 * Accessibility decisions that the reference does not have to make but a
 * competition product does:
 *   - touch / coarse pointers get the OPEN layout by default, because a fan
 *     that only opens on hover would hide three of four cards from a phone
 *   - keyboard focus inside the stack opens it too (focus-within)
 *   - prefers-reduced-motion keeps the same open/close logic but snaps
    instantly instead of springing
 */

interface AgentCard {
  no: string;
  name: string;
  job: string;
  detail: string;
  status: string;
}

const AGENTS: readonly AgentCard[] = [
  {
    no: "01",
    name: "Message Agent",
    job: "Membaca isi pesan",
    detail:
      "Urgensi palsu, otoritas yang mengaku-ngaku, iming-iming hadiah, dan permintaan OTP/PIN. Tiap temuan mengutip kalimatmu sendiri.",
    status: "aktif",
  },
  {
    no: "02",
    name: "Link Agent",
    job: "Membaca tautan",
    detail:
      "Domain yang meniru merek resmi, pemendek tautan yang menyembunyikan tujuan, dan ekstensi yang jarang dipakai situs sah.",
    status: "aktif",
  },
  {
    no: "03",
    name: "Scoring Orchestrator",
    job: "Menentukan skor",
    detail:
      "Menggabungkan temuan jadi 0–100. Permintaan OTP memaksa risiko tinggi apa pun skornya. Ini yang menilai, bukan model bahasa.",
    status: "aktif",
  },
  {
    no: "04",
    name: "Evidence Agent",
    job: "Menyiapkan laporan",
    detail:
      "Menyusun artefak dan kronologi siap cetak supaya laporan bisa dibawa ke bank. Kontrak datanya sudah beku.",
    status: "kontrak siap",
  },
] as const;

const N = AGENTS.length;

/**
 * Geometry in one place so rest and open share the same origin.
 *
 * Two opening shapes, chosen by container width:
 *   wide   horizontal fan, 205px pitch — card i's header spans [205i+16,
 *          205i+190] and card i+1 starts covering at 205i+205, so every
 *          header stays readable while bodies overlap (the reference's own
 *          trick). Alternating ±2–5° tilt around each card's center.
 *   narrow vertical staircase (phones): the horizontal fan at 205px pitch
 *          is ~820px wide and would spill off both edges of a 390px screen.
 *          Cards descend instead, each header strip clearing the card above.
 */
function layoutFor(width: number) {
  const narrow = width < 640;
  return {
    rest: (i: number) => ({
      x: i * 9,
      y: i * 7,
      rotate: 0,
      scale: 1 - i * 0.012,
    }),
    open: (i: number) =>
      narrow
        ? {
            x: (i - (N - 1) / 2) * 14,
            y: (i - (N - 1) / 2) * 92,
            rotate: (i % 2 === 0 ? -1 : 1) * 2,
            scale: 1,
          }
        : {
            x: (i - (N - 1) / 2) * 205,
            y: Math.abs(i - (N - 1) / 2) * 16,
            rotate: (i % 2 === 0 ? -1 : 1) * (2 + i),
            scale: 1,
          },
  };
}

export function AgentFan() {
  const reduceMotion = useReducedMotion();
  // Coarse pointers never get :hover, so they start open. Read once on mount.
  const [hoverCapable, setHoverCapable] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverCapable(mq.matches);
    if (!mq.matches) setPinned(true);
    const onChange = (event: MediaQueryListEvent) => {
      setHoverCapable(event.matches);
      if (!event.matches) setPinned(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const expanded = hovered || pinned || !hoverCapable;
  const animated = !reduceMotion;

  const shellRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = layoutFor(width || 960);
  // narrow opens ~370px tall (4 steps x 92px + card), wide stays 480/540
  const stackHeight =
    (width || 960) < 640 ? "h-[26rem]" : "h-[30rem] sm:h-[34rem]";

  return (
    <div ref={shellRef} className="relative mx-auto w-full max-w-4xl">
      {/*
        At rest the cards overlap and cover three of four cards' text. Hover
        reveals them for a mouse, but keyboard and touch users have no hover,
        so the same state needs an explicit control. This is the accessible
        form of the reference's interaction, which only ever had to work with
        a mouse.
      */}
      <div className="flex justify-center">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="agent-fan"
          data-pressable
          onClick={() => setPinned((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--appnext-line)] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--appnext-ink-2)] hover:bg-[var(--appnext-surface)]"
        >
          {expanded ? "Tutup tumpukan" : "Buka tumpukan"}
        </button>
      </div>

      <section
        id="agent-fan"
        aria-label="Empat agen deteksi"
        className={`relative mt-8 w-full select-none ${stackHeight}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute inset-0 grid place-items-center">
          {AGENTS.map((agent, i) => {
            const target = expanded ? layout.open(i) : layout.rest(i);
            return (
              <motion.div
                key={agent.no}
                className="appnext-card absolute h-[17rem] w-[16rem] p-5 sm:h-[19rem] sm:w-[18rem]"
                style={{
                  zIndex: N - i,
                  transformOrigin: "50% 50%",
                }}
                initial={false}
                animate={target}
                transition={
                  animated
                    ? {
                        type: "spring",
                        duration: 0.55,
                        bounce: 0.12,
                        delay: expanded ? i * 0.045 : (N - 1 - i) * 0.03,
                      }
                    : { duration: 0 }
                }
                whileHover={
                  animated && expanded ? { y: target.y - 8 } : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[12px] font-medium tracking-[0.12em] text-[var(--appnext-muted)]">
                    {agent.no}
                  </span>
                  <span className="rounded-full bg-[var(--appnext-tint)] px-2.5 py-1 text-[10px] font-medium text-[var(--appnext-blue-deep)]">
                    {agent.status}
                  </span>
                </div>

                <h3 className="mt-5 text-[19px] font-medium leading-tight tracking-[-0.4px] text-[var(--appnext-ink)]">
                  {agent.name}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-[var(--appnext-accent-strong)]">
                  {agent.job}
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--appnext-muted)]">
                  {agent.detail}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

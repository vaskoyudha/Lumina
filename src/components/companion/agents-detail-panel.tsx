"use client";

import { ArrowRight, Boxes, Hash, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useState } from "react";
import {
  AGENT_DISPLAY_NAME,
  AGENT_REGISTRY,
  AGENT_SEQUENCE,
  type DetectorAgent,
  LUMINA_STEPS,
} from "@/components/companion/agents";
import { Card } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * Agents detail — the right-hand pane while the Agents view is open.
 *
 * It replaces "Panel bukti" only on that view: the evidence panel reports a
 * run, and this pane explains the detector the reader picked. The layout follows
 * the product reference (tabs, identity block, two metric tiles, capability
 * chips, a short timeline and a status strip), but every value is read from the
 * registry. There is no accuracy or speed figure here because the app never
 * measured one per agent; the two tiles count real mechanisms and the agent's
 * real position in the pipeline instead.
 *
 * Clicking a lane swaps the brief; nothing is filtered out of the diagram.
 * The default is the first agent, so the pane is never an empty shell when
 * the overview opens from another surface.
 */

const STEP_DETAIL = [
  "Delapan pemeriksa berjalan berurutan pada satu pesan.",
  "Sinyal digabung dan dideduplikasi sebelum diskor.",
  "Engine deterministik memetakan temuan ke skala 0–100.",
] as const;

type PanelTab = "detail" | "aktivitas";

export function AgentsDetailPanel({
  selected = null,
  className,
  action,
  titleId = "panel-detail-title",
}: {
  selected?: DetectorAgent | null;
  className?: string;
  action?: ReactNode;
  /** Unique per surface: the chat renders this pane in a column and a sheet. */
  titleId?: string;
}) {
  const activeId = selected ?? AGENT_SEQUENCE[0];
  const profile = AGENT_REGISTRY[activeId];
  const index = AGENT_SEQUENCE.indexOf(activeId);
  const Icon = profile.icon;
  const { label } = STAGE_LABEL[activeId];
  const [tab, setTab] = useState<PanelTab>("detail");

  const detailTab = `${titleId}-detail`;
  const activityTab = `${titleId}-activity`;
  const detailPanel = `${titleId}-detail-panel`;
  const activityPanel = `${titleId}-activity-panel`;

  const timeline = [
    {
      name: AGENT_DISPLAY_NAME[activeId],
      action: "memeriksa pesan ini",
      note: profile.task,
    },
    {
      name: "Lumina",
      action: "menggabungkan temuan",
      note: "Sinyal dideduplikasi sebelum skor dihitung.",
    },
    {
      name: "Engine",
      action: "menghitung skor 0–100",
      note: "Deterministik, tanpa model bahasa.",
    },
  ];

  return (
    <Card
      aria-labelledby={titleId}
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-none bg-panel py-0 ring-0",
        className,
      )}
      role="region"
    >
      <h2 className="sr-only" id={titleId}>
        Detail agen
      </h2>

      <div className="shrink-0 border-line border-b px-4 pt-3">
        <div className="flex items-end justify-between gap-2">
          <div aria-label="Panel agen" className="flex gap-5" role="tablist">
            <TabButton
              active={tab === "detail"}
              controls={detailPanel}
              id={detailTab}
              onClick={() => setTab("detail")}
            >
              Detail Agen
            </TabButton>
            <TabButton
              active={tab === "aktivitas"}
              controls={activityPanel}
              id={activityTab}
              onClick={() => setTab("aktivitas")}
            >
              Aktivitas
            </TabButton>
          </div>
          {action ? (
            <div className="flex shrink-0 items-center gap-1 pb-1">
              {action}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "detail" ? (
          <div
            aria-labelledby={detailTab}
            className="space-y-5"
            id={detailPanel}
            role="tabpanel"
          >
            <div className="flex items-start gap-3.5">
              <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-brand-soft ring-1 ring-brand-edge">
                {profile.portrait ? (
                  <Image
                    alt=""
                    className="size-full object-cover"
                    height={64}
                    src={profile.portrait}
                    width={64}
                  />
                ) : (
                  <Icon aria-hidden className="size-8 text-brand-ink" />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-bold text-[19px] text-ink leading-tight">
                    {AGENT_DISPLAY_NAME[activeId]}
                  </p>
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-ink-faint tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-emerald-500"
                  />
                  <span className="font-semibold text-[10.5px] text-emerald-600">
                    Aktif
                  </span>
                  <span aria-hidden className="mx-0.5 h-2.5 w-px bg-edge" />
                  <span className="truncate font-mono text-[9px] text-ink-mute uppercase tracking-[0.08em]">
                    {label}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-dim leading-relaxed">
                  {profile.purpose}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line bg-panel-2 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10.5px] text-ink-mute">Mekanisme</span>
                  <Boxes aria-hidden className="size-4 text-brand" />
                </div>
                <p className="mt-2 font-bold text-[20px] text-ink tabular-nums leading-none">
                  {String(profile.mechanism.length).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[10px] text-dim leading-none">
                  aturan aktif
                </p>
              </div>
              <div className="rounded-xl border border-line bg-panel-2 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10.5px] text-ink-mute">Urutan</span>
                  <Hash aria-hidden className="size-4 text-brand" />
                </div>
                <p className="mt-2 font-bold text-[20px] text-ink tabular-nums leading-none">
                  {String(index + 1).padStart(2, "0")}
                  <span className="text-[12px] font-medium text-ink-faint">
                    /{String(AGENT_SEQUENCE.length).padStart(2, "0")}
                  </span>
                </p>
                <p className="mt-1 text-[10px] text-dim leading-none">
                  jalur pemeriksaan
                </p>
              </div>
            </div>

            <section className="border-line border-t pt-4">
              <h3 className="text-[13px] font-bold text-ink">
                Kemampuan Utama
              </h3>
              <ul className="mt-2.5 flex list-none flex-wrap gap-2">
                {profile.mechanism.map((item) => (
                  <li
                    className="rounded-full border border-line bg-panel px-3 py-1.5 text-[11px] font-medium text-ink-soft leading-none"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 border-brand/30 border-l-2 pl-2 text-[10.5px] text-brand-ink italic leading-snug">
                {profile.flavor}
              </p>
            </section>

            <section className="border-line border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-ink">
                  Alur Pemeriksaan
                </h3>
                <button
                  className="flex cursor-pointer items-center gap-1 font-semibold text-[11px] text-brand transition-opacity hover:opacity-80"
                  onClick={() => setTab("aktivitas")}
                  type="button"
                >
                  Lihat semua
                  <ArrowRight aria-hidden className="size-3.5" />
                </button>
              </div>
              <ol className="mt-3 list-none">
                {timeline.map((entry, entryIndex) => (
                  <li
                    className="relative flex gap-3 pb-4 last:pb-0"
                    key={`${entry.name}-${entry.action}`}
                  >
                    {entryIndex < timeline.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-4 bottom-0 left-[4px] w-px bg-brand/25"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className="relative mt-1 size-[9px] shrink-0 rounded-full border-2 border-brand bg-panel"
                    />
                    <div className="min-w-0">
                      <p className="text-[11.5px] text-ink leading-snug">
                        <span className="font-semibold">{entry.name}</span>{" "}
                        {entry.action}
                      </p>
                      <p className="mt-0.5 text-[10px] text-dim leading-snug">
                        {entry.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {profile.caveat ? (
              <p className="flex items-start gap-1.5 rounded-[12px] border border-warn/30 bg-warn/10 px-2.5 py-2 text-[10.5px] text-warn leading-snug">
                <ShieldCheck
                  aria-hidden
                  className="mt-px size-3 shrink-0 text-warn"
                />
                {profile.caveat}
              </p>
            ) : null}

            <div className="flex items-center gap-2.5 rounded-xl border border-brand-line bg-brand-soft px-3 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel text-brand-strong">
                <ShieldCheck aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[11.5px] text-brand-ink leading-snug">
                  Sistem berjalan lokal
                </p>
                <p className="text-[10px] text-brand-ink-soft leading-snug">
                  Delapan pemeriksa aktif di perangkat ini.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            aria-labelledby={activityTab}
            className="space-y-4"
            id={activityPanel}
            role="tabpanel"
          >
            <section>
              <h3 className="text-[13px] font-bold text-ink">Alur kerja</h3>
              <ol className="mt-3 list-none">
                {LUMINA_STEPS.map((step, stepIndex) => (
                  <li className="relative flex gap-3 pb-4 last:pb-0" key={step}>
                    {stepIndex < LUMINA_STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-4 bottom-0 left-[4px] w-px bg-brand/25"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className="relative mt-1 size-[9px] shrink-0 rounded-full border-2 border-brand bg-panel"
                    />
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-ink leading-snug">
                        {step}
                      </p>
                      <p className="mt-0.5 text-[10px] text-dim leading-snug">
                        {STEP_DETAIL[stepIndex]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <p className="rounded-[12px] border border-edge bg-panel px-3 py-2.5 text-[10.5px] text-dim leading-snug">
              Panel ini menjelaskan peran agen. Percakapan yang diperiksa tidak
              disimpan sebagai riwayat.
            </p>
            <p className="px-0.5 font-mono text-[8.5px] text-ink-faint uppercase tracking-[0.1em]">
              Klik kartu lain di diagram untuk berganti detail
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function TabButton({
  active,
  controls,
  id,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  id: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-controls={controls}
      aria-selected={active}
      className={cn(
        "relative cursor-pointer pb-3 text-[13px] font-semibold transition-colors duration-200 ease-out",
        active ? "text-brand" : "text-dim hover:text-ink",
      )}
      id={id}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand transition-opacity duration-200 ease-out",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}

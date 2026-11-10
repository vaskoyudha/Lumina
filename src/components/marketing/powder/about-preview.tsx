import {
  ArrowUp,
  ChevronDown,
  CircleHelp,
  Database,
  FileText,
  Mic,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { FourTickCrosshair } from "./measure-preview";

/**
 * Decorative prints for the three About cards. Each one follows the Framer
 * reference image it replaces: a large rounded panel floating over a soft
 * photo, with the same content at the same visual weight.
 *
 * Like the other prints this is a picture of the product: the root is
 * `aria-hidden` and `pointer-events-none`, and the palette comes from the
 * `--mp-*` tokens in `powder-theme.css`, so it follows the landing theme.
 */

const BACKDROPS = {
  konteks:
    "/sites/powder-framer-website-4824bd20/root-8a5edab2/M3AKVBhu25GOh5mNc4l3oWTQ5TQ.jpg",
  langkah:
    "/sites/powder-framer-website-4824bd20/root-8a5edab2/etZjwiSv1K58xyJBSdYWMrMCY3c.jpg",
  wawasan:
    "/sites/powder-framer-website-4824bd20/root-8a5edab2/Wg0HPMEvwBAB4NYqAHbCXOgrijs.jpg",
} as const;

function AboutPanel({
  backdrop,
  children,
}: {
  backdrop: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="about-preview pointer-events-none relative h-full w-full select-none overflow-hidden bg-[var(--mp-backdrop)] antialiased"
    >
      {/* biome-ignore lint/performance/noImgElement: fixed decorative backdrop, not content */}
      <img
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]"
        loading="lazy"
        src={backdrop}
      />
      <div className="absolute inset-0 flex items-center justify-center p-[9.5%]">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-[var(--mp-line-2)] bg-[var(--mp-card)] shadow-[0_30px_90px_var(--mp-shadow)]">
          {children}
        </div>
      </div>
    </div>
  );
}

const SOURCES = [
  { Icon: FileText, label: "Pesan" },
  { Icon: Database, label: "Nomor pengirim" },
  { Icon: CircleHelp, label: "Tautan" },
];

export function KonteksPreview() {
  return (
    <AboutPanel backdrop={BACKDROPS.konteks}>
      <div className="flex h-full flex-col p-[7.5%]">
        <div className="flex justify-end">
          <span className="max-w-[88%] rounded-[18px] border border-[var(--mp-bubble-line)] bg-[var(--mp-bubble)] px-5 py-3 text-[15px] leading-[1.35] text-[var(--mp-ink)]">
            Pesan ini minta OTP, tapi pengirimnya bukan bank.
          </span>
        </div>

        <p className="mt-6 text-[14px] leading-[1.55] text-[var(--mp-ink-2)]">
          Permintaan OTP, klaim pihak bank, dan nomor asing. Skor 92/100, risiko
          tinggi.
        </p>

        <div className="mt-7">
          <span className="flex items-center gap-3 text-[13px] text-[var(--mp-muted)]">
            3 hal yang diperiksa
            <span className="h-px flex-1 bg-[var(--mp-line)]" />
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {SOURCES.map(({ Icon, label }) => (
              <span
                className="flex items-center gap-2 rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] px-4 py-2 text-[13px] font-medium text-[var(--mp-ink-3)]"
                key={label}
              >
                <Icon aria-hidden="true" size={14} strokeWidth={1.6} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between rounded-[16px] border border-[var(--mp-line)] bg-[var(--mp-well)] px-4 py-3">
          <span className="text-[13.5px] text-[var(--mp-faint-2)]">
            Tanya soal pesan ini
          </span>
          <span className="flex items-center gap-2">
            <span className="grid size-[30px] place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] text-[var(--mp-ink-3)]">
              <Mic aria-hidden="true" size={14} strokeWidth={1.6} />
            </span>
            <span className="grid size-[30px] place-items-center rounded-full bg-[var(--mp-ink)] text-[var(--mp-card)]">
              <ArrowUp aria-hidden="true" size={15} strokeWidth={2} />
            </span>
          </span>
        </div>
      </div>
    </AboutPanel>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block text-[13.5px] text-[var(--mp-muted)]">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function LangkahCardPreview() {
  return (
    <AboutPanel backdrop={BACKDROPS.langkah}>
      <div className="flex h-full flex-col gap-4 p-[7.5%]">
        <Field label="Sumber">
          <span className="flex h-[50px] items-center gap-2.5 rounded-[14px] border border-[var(--mp-line-2)] bg-[var(--mp-well)] px-4 text-[15px] text-[var(--mp-ink)]">
            <UserRound
              aria-hidden="true"
              className="text-[var(--mp-muted)]"
              size={17}
              strokeWidth={1.6}
            />
            <span className="min-w-0 flex-1 truncate">Pesan WhatsApp</span>
            <ChevronDown
              aria-hidden="true"
              className="text-[var(--mp-muted)]"
              size={17}
              strokeWidth={1.6}
            />
          </span>
        </Field>

        <Field label="Temuan">
          <span className="flex h-[50px] items-center gap-2.5 rounded-[14px] border border-[var(--mp-line-2)] bg-[var(--mp-well)] px-4 text-[15px] text-[var(--mp-ink)]">
            <span className="size-[10px] shrink-0 rounded-full bg-[var(--mp-danger)]" />
            <span className="min-w-0 flex-1 truncate">Permintaan OTP</span>
            <ChevronDown
              aria-hidden="true"
              className="text-[var(--mp-muted)]"
              size={17}
              strokeWidth={1.6}
            />
          </span>
        </Field>

        <Field label="Ringkasan">
          <p className="rounded-[14px] border border-[var(--mp-line-2)] bg-[var(--mp-well)] px-4 py-3 text-[13.5px] leading-[1.5] text-[var(--mp-muted)]">
            Pengirim mengaku bank dan meminta kode OTP.
          </p>
        </Field>

        <div className="mt-auto flex gap-3">
          <span className="flex h-[46px] flex-1 items-center justify-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] text-[14.5px] font-medium text-[var(--mp-ink-2)]">
            Buka modul
          </span>
          <span className="flex h-[46px] flex-1 items-center justify-center rounded-full bg-[var(--mp-ink)] text-[14.5px] font-medium text-[var(--mp-card)]">
            Periksa lagi
          </span>
        </div>
      </div>
    </AboutPanel>
  );
}

const TABS = ["Progres", "Modul", "Simulasi"];

const STATS = [
  { value: "1", label: "modul selesai" },
  { value: "1", label: "simulasi" },
];

const INSIGHTS = [
  "Modul 10 selesai.",
  "Simulasi APK: 2 keputusan berisiko.",
  "Lanjut ke modul 2.",
];

export function WawasanCardPreview() {
  return (
    <AboutPanel backdrop={BACKDROPS.wawasan}>
      <div className="flex h-full flex-col p-[7.5%]">
        <div className="flex rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-well)] p-1">
          {TABS.map((tab, index) => (
            <span
              className={`flex h-[38px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full text-[12px] sm:text-[13px] ${
                index === 0
                  ? "border border-[var(--mp-line-2)] bg-[var(--mp-card)] font-medium text-[var(--mp-ink)]"
                  : "text-[var(--mp-muted)]"
              }`}
              key={tab}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="mt-7 flex items-stretch">
          {STATS.map((stat, index) => (
            <div className="flex flex-1 items-stretch" key={stat.label}>
              {index > 0 ? (
                <span className="mx-4 w-px shrink-0 bg-[var(--mp-line)]" />
              ) : null}
              <div className="min-w-0 flex-1">
                <span className="block text-[30px] font-medium leading-none tracking-[-0.02em] text-[var(--mp-ink)]">
                  {stat.value}
                </span>
                <span className="mt-2 block text-[13.5px] text-[var(--mp-muted)]">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          {INSIGHTS.map((text, index) => (
            <div
              className={`flex flex-1 items-center gap-3 border-t border-[var(--mp-line)] py-3.5 ${
                index === INSIGHTS.length - 1 ? "opacity-55" : ""
              }`}
              key={text}
            >
              <FourTickCrosshair className="shrink-0 text-[var(--mp-muted)]" />
              <p className="text-[13.5px] leading-[1.5] text-[var(--mp-muted)]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AboutPanel>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import "../runtime/features-scroll-pin.css";
import { AskPreview } from "../ask-preview";
import { LangkahPreview } from "../langkah-preview";
import { MeasurePreview } from "../measure-preview";
import { PeriksaPreview } from "../periksa-preview";

/* Section extracted verbatim from the published Framer site: Features.
   The four slides used to be static images; the strip above the gallery now
   drives which one is visible, and all four are live prints
   (`ask-preview.tsx`, `periksa-preview.tsx`, `langkah-preview.tsx`,
   `measure-preview.tsx`) instead of their raster references.

   On tabbed breakpoints the section also pins while scrolling: the runway in
   `FeaturesScrollPin`-style code below spends three preview-lengths of scroll,
   then releases. Phones keep the rasters and never pin. */

const TABS = ["Tanya", "Periksa", "Langkah", "Ukur"] as const;
type TabIndex = 0 | 1 | 2 | 3;

const TAB_WRAPPERS = [
  "framer-121s4kf",
  "framer-1y3azrk",
  "framer-1d4vjsq",
  "framer-1oqw6fp",
] as const;

const TAB_CONTAINERS = [
  "framer-1yr22n0-container",
  "framer-1d5vmaz-container",
  "framer-1d9v07k-container",
  "framer-bxecf9-container",
] as const;

const IMG_SIZES =
  "(min-width: 1280px) max(min(min(100vw, 1600px) - 48px, 1080px), 1px), (min-width: 810px) and (max-width: 1279.98px) max(min(min(100vw, 1600px) - 48px, 720px), 1px), (max-width: 809.98px) max(min(min(100vw, 1600px) - 48px, 720px), 1px)";

const BG_CLASSES = [
  "framer-15ixqzl",
  "framer-11fd6yx",
  "framer-kda24n",
  "framer-yfsspb",
] as const;

const SLIDES = [
  {
    file: "ZCUolRzdTgZF2qcr3flePPx2dk",
    alt: "Tanya: pratinjau companion dengan contoh pesan APK undangan dan tugas top-up.",
  },
  {
    file: "v9Yr4trFZsygSFKIZye6oMUY4",
    alt: "Periksa: skor 0 sampai 100 dengan kutipan alasan dan panel bukti dari delapan agen.",
  },
  {
    file: "hg3Tg24LlqTuZEp7hHXSGwPQ9U",
    alt: "Langkah: langkah berikutnya untuk pesan yang sudah diklik atau ditransfer.",
  },
  {
    file: "eFufq0tptTi9Qq7gFHic5a5E",
    alt: "Ukur: ringkasan pola yang pernah ditemui dan progres belajar per akun.",
  },
] as const;

const slideSrc = (file: string) =>
  `/sites/powder-framer-website-4824bd20/root-8a5edab2/${file}.jpg`;

const slideSrcSet = (file: string) =>
  [512, 1024, 2048, 2500]
    .map((width) => `${slideSrc(file)} ${width}w`)
    .join(", ");

function FeatureTabs({
  active,
  onChange,
}: {
  active: TabIndex;
  onChange: (index: TabIndex) => void;
}) {
  return (
    <div className="framer-bxj4ii">
      <div className="framer-1fgb0ay-container">
        <div
          style={{
            height: "100%",
            width: "100%",
            position: "relative",
            borderRadius: "72px 72px 72px 72px",
            overflow: "hidden",
            background:
              "var(--token-ef8ecd6d-5204-4f29-b3b7-2d4dc011513a, rgb(0, 0, 0))",
          }}
        >
          <div
            data-glow="true"
            style={{
              position: "absolute",
              inset: "0",
              opacity: "0",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "1px",
              borderRadius: "71px 71px 71px 71px",
              background:
                "var(--token-259d8c78-fccd-4e6b-bbb0-32a9dcab750e, rgba(0, 0, 0, 0.85))",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {TABS.map((tab, index) => {
        const isActive = active === index;
        return (
          <div className={TAB_WRAPPERS[index]} key={tab}>
            <div className={TAB_CONTAINERS[index]}>
              <div
                aria-pressed={isActive}
                className="framer-X2hsG framer-gF1Dm framer-8x98wc framer-v-1lugq31"
                data-border="false"
                data-framer-name={isActive ? "Active" : "Inactive"}
                data-highlight="true"
                onClick={() => onChange(index as TabIndex)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onChange(index as TabIndex);
                  }
                }}
                role="button"
                style={{
                  backgroundColor:
                    "var(--token-1ec80be1-93dc-4b5e-a38f-5b1f087c77a5, rgba(255, 255, 255, 0))",
                  width: "100%",
                  borderRadius: "609px",
                }}
                tabIndex={0}
              >
                <div className="framer-arwdi5-container" style={{ opacity: 0 }}>
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      position: "relative",
                      borderRadius: "66px 66px 66px 66px",
                      overflow: "hidden",
                      background:
                        "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, rgba(255, 255, 255, 0.05))",
                    }}
                  >
                    <div
                      data-glow="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        opacity: "0",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: "1px",
                        borderRadius: "65px 65px 65px 65px",
                        background:
                          "var(--token-feab5ab7-d914-42dd-ad2d-73b5c8596806, rgba(33, 33, 33, 0.85))",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="framer-1wvl2qz"
                  style={{
                    mask: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0, 0, 0) 50.49169398299905%, rgba(0, 0, 0, 0) 100%) add",
                    WebkitMask:
                      "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgb(0, 0, 0) 50.49169398299905%, rgba(0, 0, 0, 0) 100%) add",
                    borderRadius: "2px",
                  }}
                />
                <div
                  className="framer-1hp9gbb"
                  data-framer-component-type="RichTextContainer"
                  style={{
                    "--extracted-r6o4lv":
                      "var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8))",
                    "--framer-link-text-color": "var(--pw-link, rgb(0, 153, 255))",
                    "--framer-link-text-decoration": "underline",
                    transform: "none",
                  }}
                >
                  <p
                    className={`framer-text framer-styles-preset-prenqk ${
                      isActive
                        ? "font-medium after:absolute after:inset-x-0 after:-bottom-1 after:h-[2px] after:rounded-full after:bg-[var(--token-c6de8ea4-3684-4c2f-917e-fc3d1879d6b0)] after:content-['']"
                        : ""
                    } relative`}
                    data-styles-preset="POYKcChXw"
                    dir="auto"
                    style={{
                      "--framer-text-color":
                        "var(--extracted-r6o4lv, var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8)))",
                    }}
                  >
                    {tab}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureGallery({
  active,
  live = true,
  radius,
}: {
  active: TabIndex;
  live?: boolean;
  radius: number;
}) {
  return (
    <div
      className="framer-s53wdq"
      data-framer-name="Image"
      style={{
        borderBottomLeftRadius: radius,
        borderBottomRightRadius: radius,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      }}
    >
      <div className="framer-1z06g9z-container">
        <div
          style={{
            height: "100%",
            width: "100%",
            position: "relative",
            borderRadius: "32px 32px 32px 32px",
            overflow: "hidden",
            background:
              "var(--token-ef8ecd6d-5204-4f29-b3b7-2d4dc011513a, rgb(0, 0, 0))",
          }}
        >
          <div
            data-glow="true"
            style={{
              position: "absolute",
              inset: "0",
              opacity: "0",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "1px",
              borderRadius: "31px 31px 31px 31px",
              background:
                "var(--token-259d8c78-fccd-4e6b-bbb0-32a9dcab750e, rgba(0, 0, 0, 0.85))",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div className="framer-huqvop-container" data-framer-name="Gallery">
        <div
          className="framer-Koyr7 framer-1go82wr framer-v-udemba"
          data-border="true"
          data-framer-name={`Active ${active + 1}`}
          data-highlight="true"
          style={{
            "--border-bottom-width": "1px",
            "--border-color":
              "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
            "--border-left-width": "1px",
            "--border-right-width": "1px",
            "--border-style": "solid",
            "--border-top-width": "1px",
            "--kvl241": "80px 120px 0px 120px",
            backgroundColor:
              "var(--token-8b167a44-1235-4402-851c-e953878eef1e, rgb(36, 36, 36))",
            height: "100%",
            width: "100%",
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          }}
          tabIndex={0}
        >
          {SLIDES.map((slide, index) => {
            const isActive = active === index;
            return (
              <div
                className={BG_CLASSES[index]}
                data-framer-name={`BG ${index + 1}`}
                key={slide.file}
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 300ms ease",
                }}
              >
                {live && index === 0 ? (
                  <AskPreview />
                ) : live && index === 1 ? (
                  <PeriksaPreview />
                ) : live && index === 2 ? (
                  <LangkahPreview />
                ) : live && index === 3 ? (
                  <MeasurePreview />
                ) : (
                  <div
                    data-framer-background-image-wrapper="true"
                    style={{
                      position: "absolute",
                      borderRadius: "inherit",
                      top: "0",
                      right: "0",
                      bottom: "0",
                      left: "0",
                    }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: circular Framer gallery print; next/image adds no value here */}
                    <img
                      alt={slide.alt}
                      decoding="async"
                      height={1406}
                      loading="lazy"
                      sizes={IMG_SIZES}
                      src={slideSrc(slide.file)}
                      srcSet={slideSrcSet(slide.file)}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: "inherit",
                        objectPosition: "center",
                        objectFit: "cover",
                      }}
                      width={2500}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeatureCaption({
  label,
  mobile = false,
  onNext,
  onPrev,
}: {
  label: string;
  mobile?: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="framer-g7nwep">
      <div className="framer-1w1a2qk">
        <div className="framer-1ulb7kg-container">
          <div
            style={{
              height: "100%",
              width: "100%",
              position: "relative",
              borderRadius: "72px 72px 72px 72px",
              overflow: "hidden",
              background:
                "var(--token-ef8ecd6d-5204-4f29-b3b7-2d4dc011513a, rgb(0, 0, 0))",
            }}
          >
            <div
              data-glow="true"
              style={{
                position: "absolute",
                inset: "0",
                opacity: "0",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "1px",
                borderRadius: "71px 71px 71px 71px",
                background:
                  "var(--token-259d8c78-fccd-4e6b-bbb0-32a9dcab750e, rgba(0, 0, 0, 0.85))",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        <div
          className="framer-1i58yo8"
          style={{
            transform: mobile
              ? "translateY(-50%)"
              : "translate(-50%, -50%)",
          }}
        >
          <div
            className="framer-1yef0t7"
            data-framer-component-type="RichTextContainer"
            style={{
              "--extracted-r6o4lv":
                "var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8))",
              "--framer-link-text-color": "var(--pw-link, rgb(0, 153, 255))",
              "--framer-link-text-decoration": "underline",
              transform: "none",
            }}
          >
            <p
              className="framer-text framer-styles-preset-prenqk"
              data-styles-preset="POYKcChXw"
              dir="auto"
              style={{
                "--framer-text-alignment": "center",
                "--framer-text-color":
                  "var(--extracted-r6o4lv, var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8)))",
              }}
            >
              {label}
            </p>
          </div>
        </div>

        <div
          className="framer-13ksk3f"
          style={mobile ? { transform: "translate(-50%, -50%)" } : undefined}
        >
          <ArrowButton direction="prev" onClick={onPrev} />
          <ArrowButton direction="next" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <div
      className={isPrev ? "framer-1apng7n" : "framer-b1lpai"}
      data-framer-name="button 3.0"
    >
      <div
        className={
          isPrev ? "framer-5mfhfn-container" : "framer-n1yqeo-container"
        }
      >
        <a
          aria-label={isPrev ? "Pratinjau sebelumnya" : "Pratinjau berikutnya"}
          className="framer-FkYLp framer-knjRQ framer-efr9v5 framer-v-h8s8pe framer-ces3t"
          data-border="true"
          data-framer-name="L Icon"
          data-highlight="true"
          onClick={onClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick();
            }
          }}
          role="button"
          style={{
            "--border-bottom-width": "1px",
            "--border-color":
              "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
            "--border-left-width": "1px",
            "--border-right-width": "1px",
            "--border-style": "solid",
            "--border-top-width": "1px",
            backdropFilter: "none",
            backgroundColor:
              "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
            WebkitBackdropFilter: "none",
            height: "100%",
            width: "100%",
            borderBottomLeftRadius: "768px",
            borderBottomRightRadius: "768px",
            borderTopLeftRadius: "768px",
            borderTopRightRadius: "768px",
          }}
          tabIndex={0}
        >
          <svg
            className={
              isPrev
                ? "framer-0Vdhp framer-12ejusb"
                : "framer-m6IyR framer-12ejusb"
            }
            role="presentation"
            style={{
              "--1ww558a": "1",
              "--4rxgx6":
                "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))",
            }}
            viewBox="0 0 24 24"
          >
            <use href={isPrev ? "#3950368055" : "#2047441354"} />
          </svg>
        </a>
      </div>
    </div>
  );
}

const FEATURE_STEPS = 4;
const FEATURE_MIN_WIDTH = 810;
const FEATURE_NAV_GAP = 8;
const FEATURE_STEP_RATIO = 0.6;
const FEATURE_INTRO_FADE = 180;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function navBottom(): number {
  const nav = document.querySelector<HTMLElement>(
    'nav[aria-label="Navigasi utama"]',
  );
  return nav ? nav.getBoundingClientRect().bottom : 64;
}

type FeaturePin = {
  pinTop: number;
  travel: number;
};

export default function Features() {
  const [active, setActive] = useState<TabIndex>(0);
  const runwayRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<FeaturePin | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const runway = runwayRef.current;
    const section = sectionRef.current;
    if (!runway || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const intro = section.querySelector<HTMLElement>(".framer-1hlmmg8");

    const reset = () => {
      runway.style.removeProperty("height");
      delete runway.dataset.pwPinned;
      section.style.removeProperty("--pw-features-top");
      intro?.style.removeProperty("opacity");
      pinRef.current = null;
    };

    const paint = () => {
      raf = 0;
      const pin = pinRef.current;
      if (!pin || pin.travel <= 0) return;

      const top = runway.getBoundingClientRect().top;
      const progress = clamp01((pin.pinTop - top) / pin.travel);
      const next = Math.min(
        FEATURE_STEPS - 1,
        Math.floor(progress * FEATURE_STEPS),
      );

      if (next !== indexRef.current) {
        indexRef.current = next;
        setActive(next as TabIndex);
      }

      // The pin starts with the heading already above the nav. Fade the intro
      // over the approach so a half-cut heading is not left frozen behind the
      // translucent header for the whole run.
      if (intro) {
        const opacity = clamp01((top - pin.pinTop) / FEATURE_INTRO_FADE);
        intro.style.opacity = opacity >= 1 ? "" : opacity.toFixed(3);
      }
    };

    const measure = () => {
      raf = 0;

      const stage = Array.from(
        section.querySelectorAll<HTMLElement>(".framer-1aga6xl"),
      ).find((element) => element.getBoundingClientRect().width > 0);

      if (window.innerWidth < FEATURE_MIN_WIDTH || !stage) {
        reset();
        return;
      }

      const sectionTop = section.getBoundingClientRect().top;
      const stageTop = stage.getBoundingClientRect().top - sectionTop;
      // Negative top: the section starts sticking only once the tab strip is
      // about to meet the nav, so the heading scrolls away first and the
      // gallery stays level while the previews advance.
      const pinTop = Math.round(navBottom() + FEATURE_NAV_GAP - stageTop);
      const step = Math.max(
        300,
        Math.round(window.innerHeight * FEATURE_STEP_RATIO),
      );
      const travel = step * (FEATURE_STEPS - 1);

      runway.style.height = `${section.offsetHeight + travel}px`;
      runway.dataset.pwPinned = "true";
      section.style.setProperty("--pw-features-top", `${pinTop}px`);
      pinRef.current = { pinTop, travel };

      paint();
    };

    const scheduleMeasure = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    const schedulePaint = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    measure();
    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("load", scheduleMeasure);

    // Fonts and media can change the section height after hydration; re-measure
    // so the runway and pin offset stay in sync with the real layout.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);
    observer?.observe(section);
    document.fonts?.ready.then(scheduleMeasure).catch(() => {});

    return () => {
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("load", scheduleMeasure);
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      reset();
    };
  }, []);

  const select = (index: number) => {
    const pin = pinRef.current;
    if (pin && window.innerWidth >= FEATURE_MIN_WIDTH) {
      const runway = runwayRef.current;
      const top = runway?.getBoundingClientRect().top ?? 0;
      const sticking =
        top <= pin.pinTop + 1 && top >= pin.pinTop - pin.travel;

      if (sticking) {
        const runwayTop = top + window.scrollY;
        // Land in the middle of the preview's scroll band, not on its edge, so
        // the next scroll frame cannot flip the active tab back across the
        // floor() boundary.
        const progress = (index + 0.5) / FEATURE_STEPS;
        window.scrollTo({
          top: runwayTop - pin.pinTop + progress * pin.travel,
          behavior: "smooth",
        });
      }
    }

    setActive(index as TabIndex);
  };

  const next = () => select((active + 1) % 4);
  const prev = () => select((active + 3) % 4);

  return (
    <div
      className="pw-features-runway"
      data-pw-features-runway="true"
      ref={runwayRef}
    >
      <section
        className="framer-95w5xq"
        data-border="true"
        data-framer-name="Features"
        ref={sectionRef}
      >
      <div className="framer-1x30egh" data-framer-name="content">
        <div className="framer-1hlmmg8">
          <div className="framer-ji2ver">
            <div className="ssr-variant">
              <div
                className="framer-ma0ej6-container"
                style={{
                  willChange: "transform",
                  opacity: "0",
                  transform: "translateY(24px)",
                }}
              >
                <a
                  className="framer-l6iRm framer-knjRQ framer-1uiucns framer-v-1uiucns framer-1dkgg6h"
                  data-border="true"
                  data-framer-name="Chip"
                  style={{
                    "--1x5nw16": "4px 16px 4px 16px",
                    "--border-bottom-width": "1px",
                    "--border-color":
                      "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                    "--border-left-width": "1px",
                    "--border-right-width": "1px",
                    "--border-style": "solid",
                    "--border-top-width": "1px",
                    backgroundColor:
                      "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                    borderBottomLeftRadius: "393px",
                    borderBottomRightRadius: "393px",
                    borderTopLeftRadius: "393px",
                    borderTopRightRadius: "393px",
                  }}
                >
                  <div
                    className="framer-10cfw4u"
                    style={{
                      backgroundColor:
                        "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))",
                      willChange: "transform",
                      borderBottomLeftRadius: "215px",
                      borderBottomRightRadius: "215px",
                      borderTopLeftRadius: "215px",
                      borderTopRightRadius: "215px",
                      opacity: "1",
                      transform: "none",
                    }}
                  />
                  <div
                    className="framer-1n35c0f"
                    style={{ mask: "none", WebkitMask: "none" }}
                  >
                    <div
                      className="framer-r48zlf"
                      data-framer-component-type="RichTextContainer"
                      style={{
                        "--extracted-r6o4lv":
                          "var(--variable-reference-Dh_X3w3jZ-m54zGBZ4w)",
                        "--variable-reference-Dh_X3w3jZ-m54zGBZ4w":
                          "var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8))",
                        transform: "none",
                      }}
                    >
                      <p
                        className="framer-text framer-styles-preset-1fhxhj6"
                        data-styles-preset="O0790qsZT"
                        dir="auto"
                        style={{
                          "--framer-text-alignment": "center",
                          "--framer-text-color":
                            "var(--extracted-r6o4lv, var(--variable-reference-Dh_X3w3jZ-m54zGBZ4w))",
                        }}
                      >
                        Fitur inti
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div
              className="framer-g4djhd"
              data-framer-component-type="RichTextContainer"
              style={{
                willChange: "transform",
                opacity: "0",
                transform: "translateY(24px)",
              }}
            >
              <h2
                className="framer-text framer-styles-preset-fahce0"
                data-styles-preset="nZtZfLTSW"
                dir="auto"
              >
                Satu alur untuk memeriksa,{" "}
                <span
                  className="framer-text"
                  style={{
                    "--framer-text-color":
                      "var(--token-c6de8ea4-3684-4c2f-917e-fc3d1879d6b0, rgba(255, 255, 255, 0.65))",
                  }}
                >
                  memahami, dan bertindak
                </span>
              </h2>
            </div>
          </div>
          <div className="framer-nbmdq6">
            <div className="framer-p2a3mm">
              <div
                className="framer-n8lr8h"
                data-framer-component-type="RichTextContainer"
                style={{
                  willChange: "transform",
                  opacity: "0",
                  transform: "translateY(24px)",
                }}
              >
                <p
                  className="framer-text framer-styles-preset-prenqk"
                  data-styles-preset="POYKcChXw"
                  dir="auto"
                >
                  Lumina membaca pesan, menyebut polanya, lalu menyiapkan langkah
                  berikutnya tanpa formulir panjang.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="ssr-variant hidden-3job37 hidden-nzvz5l">
          <div className="framer-f8ai71-container">
            <div
              className="framer-IbAGZ framer-gF1Dm framer-1eml1x3 framer-v-1eml1x3"
              data-framer-name="Variant 1"
              style={{ width: "100%" }}
            >
              <div className="framer-1aga6xl">
                <FeatureTabs active={active} onChange={select} />
                <FeatureGallery active={active} radius={24} />
              </div>
              <FeatureCaption
                label="Mulai dari satu pertanyaan, lalu ikuti jalurnya sampai selesai."
                onNext={next}
                onPrev={prev}
              />
            </div>
          </div>
        </div>

        <div className="ssr-variant hidden-kj696b hidden-nzvz5l">
          <div className="framer-f8ai71-container">
            <div
              className="framer-IbAGZ framer-gF1Dm framer-1eml1x3 framer-v-1eml1x3"
              data-framer-name="Variant 1"
              style={{ width: "100%" }}
            >
              <div className="framer-1aga6xl">
                <FeatureTabs active={active} onChange={select} />
                <FeatureGallery active={active} radius={16} />
              </div>
              <FeatureCaption
                label="Mulai dari satu pertanyaan, lalu ikuti jalurnya sampai selesai."
                onNext={next}
                onPrev={prev}
              />
            </div>
          </div>
        </div>

        <div className="ssr-variant hidden-3job37 hidden-kj696b">
          <div className="framer-f8ai71-container">
            <div
              className="framer-IbAGZ framer-gF1Dm framer-1eml1x3 framer-v-k3989t"
              data-framer-name="Mobile"
              style={{ width: "100%" }}
            >
              <div className="framer-1aga6xl">
                <FeatureGallery active={active} radius={12} />
              </div>
              <FeatureCaption
                label={TABS[active]}
                mobile
                onNext={next}
                onPrev={prev}
              />
            </div>
          </div>
        </div>
      </div>
      </section>
    </div>
  );
}

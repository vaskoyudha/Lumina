"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/* Section extracted verbatim from the published Framer site: Testimonials */

const BASE = "/sites/powder-framer-website-4824bd20/root-8a5edab2/";

const SIZES =
  "(min-width: 1280px) max(((min(min(100vw, 1600px) - 48px, 1080px) - NaNpx) - 40px) * 0.4, 1px), (min-width: 810px) and (max-width: 1279.98px) 160px, (max-width: 809.98px) 160px";

type Slide = {
  quote: string;
  name: string;
  role: string;
  file: string;
  layer: string;
  label: string;
};

/* Slide order 1 -> 5. Layers render in reverse DOM order (5 -> 1) like the reference. */
const SLIDES: Slide[] = [
  {
    quote:
      "Pesan undangan APK dari kurir palsu masuk jam makan siang. Lumina menyebut pola penipuan dan bagian pesan yang memicunya sebelum saya sempat membuka tautannya.",
    name: "Rani",
    role: "Karyawan swasta · Skenario ilustrasi",
    file: "2uayq1aC9XZcwLgTTRK6M2ok8KE.jpg",
    layer: "framer-1pti5mr",
    label: "1",
  },
  {
    quote:
      "Tawaran kerja yang meminta transfer biaya pelatihan terdengar masuk akal. Panel bukti menunjukkan pola yang sama dengan modul yang pernah saya baca.",
    name: "Dimas",
    role: "Pencari kerja · Skenario ilustrasi",
    file: "6qMq4KZghjDbviFxb8hhxGW0fT0.jpg",
    layer: "framer-1wcmz6a",
    label: "2",
  },
  {
    quote:
      "Saya sempat hampir percaya investasi dengan untung tetap. Lumina tidak melarang, tapi menunjukkan mengapa pesannya mencurigakan.",
    name: "Sinta",
    role: "Wirausaha · Skenario ilustrasi",
    file: "PahuPLrBYO2JdmGOgzCORNG7Q.jpg",
    layer: "framer-135zph7",
    label: "3",
  },
  {
    quote:
      "Sebagai pengajar, saya pakai modul dan simulasi untuk mengenalkan pola penipuan ke murid. Bahasanya bisa diikuti tanpa istilah teknis.",
    name: "Pak Andi",
    role: "Guru · Skenario ilustrasi",
    file: "8PPauCURBfmckfonpgSJY9NbDQ.jpg",
    layer: "framer-eoobwm",
    label: "4",
  },
  {
    quote:
      "Mode darurat membantu saat pesan penipuan sudah masuk. Langkah aman dan laporan PDF bisa langsung dipakai.",
    name: "Nadia",
    role: "Ibu rumah tangga · Skenario ilustrasi",
    file: "pepH1APN2yML7ExisXYWgAZwSH0.jpg",
    layer: "framer-649ja3",
    label: "5",
  },
];

/* DOM order of the absolutely positioned slide layers is 5 -> 1. */
const LAYER_ORDER = [4, 3, 2, 1, 0];

const DESKTOP_VARIANT = [
  "framer-v-10iffj1",
  "framer-v-1mdi6bf",
  "framer-v-13jdwd4",
  "framer-v-ii1ko9",
  "framer-v-s7nwtn",
];

const MOBILE_VARIANT = [
  "framer-v-1qa5lcv",
  "framer-v-glhykx",
  "framer-v-1lke761",
  "framer-v-12v8av5",
  "framer-v-qderzv",
];

const DOT_ON = "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))";
const DOT_OFF = "var(--token-e3ce13ec-ba16-45a8-a084-ab9af1d723e8, rgba(255, 255, 255, 0.25))";
const DOT_KEYS = ["framer-1m4cjig", "framer-1d9lhv9", "framer-i481mf", "framer-p9norm", "framer-1d9t59u"];

const SLIDE_FADE = { type: "spring", bounce: 0, duration: 1 } as const;
const TEXT_SPRING = { type: "spring", duration: 0.6, bounce: 0.2 } as const;

const PILL_STYLE = {
  "--border-bottom-width": "1px",
  "--border-color": "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
  "--border-left-width": "1px",
  "--border-right-width": "1px",
  "--border-style": "solid",
  "--border-top-width": "1px",
  backdropFilter: "none",
  backgroundColor: "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
  WebkitBackdropFilter: "none",
  height: "100%",
  width: "100%",
  borderBottomLeftRadius: "768px",
  borderBottomRightRadius: "768px",
  borderTopLeftRadius: "768px",
  borderTopRightRadius: "768px",
} as React.CSSProperties;

type CopyKind = "desktop" | "tablet" | "mobile";

type CopyProps = {
  kind: CopyKind;
  index: number;
  dir: "up" | "down";
  onPrev: () => void;
  onNext: () => void;
};

function SlideLayer({ slide, active }: { slide: Slide; active: boolean }) {
  return (
    <motion.div
      className={slide.layer}
      data-framer-name={slide.label}
      data-framer-appear-id={`testimonial-slide-${slide.label}`}
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={SLIDE_FADE}
      style={{ transform: "none" }}
    >
      <div
        style={{
          position: "absolute",
          borderRadius: "inherit",
          cornerShape: "inherit",
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        }}
        data-framer-background-image-wrapper="true"
      >
        <img
          decoding="async"
          width={1450}
          height={1925}
          sizes={SIZES}
          srcSet={`${BASE}${slide.file} 771w, ${BASE}${slide.file} 1450w`}
          src={`${BASE}${slide.file}`}
          alt="Potret ilustrasi skenario"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            cornerShape: "inherit",
            objectPosition: "center",
            objectFit: "cover",
          }}
        />
      </div>
    </motion.div>
  );
}

function FadeText({
  index,
  dir,
  children,
}: {
  index: number;
  dir: "up" | "down";
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={index}
        initial={{ y: dir === "up" ? "100%" : "-100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: TEXT_SPRING }}
        exit={{ y: dir === "up" ? "-100%" : "100%", opacity: 0 }}
        style={{ maxWidth: "100%", width: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function Copy({ kind, index, dir, onPrev, onNext }: CopyProps) {
  const slide = SLIDES[index - 1];
  const isDesktop = kind === "desktop";
  const variant = isDesktop ? DESKTOP_VARIANT[index - 1] : MOBILE_VARIANT[index - 1];
  const pad = isDesktop ? "48px" : kind === "tablet" ? "28px" : "24px";
  const quoteSize = isDesktop ? "24px" : "20px";

  return (
    <div className="framer-xtsmp9-container">
      <div
        className={`framer-etOFx framer-10iffj1 ${variant}`}
        data-framer-name={`${isDesktop ? "Desktop" : "Mobile"} ${index}`}
        style={{
          "--2htdkc": pad,
          "--border-bottom-width": "0px",
          "--border-color": "rgba(0, 0, 0, 0)",
          "--border-left-width": "0px",
          "--border-right-width": "0px",
          "--border-style": "solid",
          "--border-top-width": "0px",
          backgroundColor: "rgba(0, 0, 0, 0)",
          width: "100%",
          borderBottomLeftRadius: "0px",
          borderBottomRightRadius: "0px",
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
        } as React.CSSProperties}
      >
        {isDesktop && (
          <>
            <div className="framer-s2natp-container">
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  position: "relative",
                  borderRadius: "24px 24px 24px 24px",
                  overflow: "hidden",
                  background: "var(--token-ef8ecd6d-5204-4f29-b3b7-2d4dc011513a, rgb(0, 0, 0))",
                }}
              >
                <div data-glow="true" style={{ position: "absolute", inset: "0", opacity: "0", pointerEvents: "none" }} />
                <div
                  style={{
                    position: "absolute",
                    inset: "1px",
                    borderRadius: "23px 23px 23px 23px",
                    background: "var(--token-259d8c78-fccd-4e6b-bbb0-32a9dcab750e, rgba(0, 0, 0, 0.85))",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
            <div className="framer-161oy3n-container">
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  position: "relative",
                  borderRadius: "16px 16px 16px 16px",
                  overflow: "hidden",
                  background: "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                }}
              >
                <div data-glow="true" style={{ position: "absolute", inset: "0", opacity: "0", pointerEvents: "none" }} />
                <div
                  style={{
                    position: "absolute",
                    inset: "1px",
                    borderRadius: "15px 15px 15px 15px",
                    background: "var(--token-9a0a5818-786e-4389-a1ff-e52b77b8236e, rgba(15, 15, 15, 0.85))",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div className="framer-1kj8zu">
          <div className="framer-1f62xiu" data-framer-name="Logos">
            <div
              className="framer-9k18V framer-1mofheo"
              style={{
                "--o4jego": "var(--token-c6de8ea4-3684-4c2f-917e-fc3d1879d6b0, rgba(255, 255, 255, 0.65))",
              } as React.CSSProperties}
            />
          </div>
          <div className="framer-byjvk3">
            <div className="framer-yyzj2l">
              <div
                className="framer-13me9o2-container"
                style={{ willChange: "transform", opacity: "0", transform: "translateY(24px)" }}
              >
                <div style={{ maxWidth: "100%", width: "100%", overflow: "hidden" }}>
                  <FadeText index={index} dir={dir}>
                    <p
                      style={{
                        margin: "0",
                        fontFamily: '"Inter", "Inter Placeholder", sans-serif',
                        fontSize: quoteSize,
                        fontStyle: "normal",
                        fontWeight: "400",
                        letterSpacing: "-0.04em",
                        lineHeight: "1.6em",
                        color: "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))",
                      }}
                    >
                      {slide.quote}
                    </p>
                  </FadeText>
                </div>
              </div>
            </div>

            <div className="framer-5dsji">
              <div
                className="framer-17my8xj"
                style={{
                  backgroundColor: "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                  willChange: "transform",
                  opacity: "0",
                  transform: "translateY(24px)",
                }}
              />
              <div className="framer-1n4kt44" style={{ willChange: "transform", opacity: "0", transform: "translateY(24px)" }}>
                <div className="framer-nm5syh">
                  <div
                    className="framer-17zzgkj"
                    data-framer-name="button 3.0"
                    data-highlight="true"
                    tabIndex={0}
                    role="button"
                    aria-label="Previous testimonial"
                    onClick={onPrev}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="framer-wzaela-container">
                      <a className="framer-FkYLp framer-knjRQ framer-efr9v5 framer-v-h8s8pe framer-ces3t" data-border="true" data-framer-name="L Icon" data-highlight="true" tabIndex={0} style={PILL_STYLE}>
                        <svg className="framer-0Vdhp framer-12ejusb" role="presentation" viewBox="0 0 24 24" style={{ "--1ww558a": "1", "--4rxgx6": "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))" } as React.CSSProperties}>
                          <use href="#3950368055" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  <div
                    className="framer-45ypi"
                    data-framer-name="button 3.0"
                    data-highlight="true"
                    tabIndex={0}
                    role="button"
                    aria-label="Next testimonial"
                    onClick={onNext}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="framer-1l5r6fm-container">
                      <a className="framer-FkYLp framer-knjRQ framer-efr9v5 framer-v-h8s8pe framer-ces3t" data-border="true" data-framer-name="L Icon" data-highlight="true" tabIndex={0} style={PILL_STYLE}>
                        <svg className="framer-m6IyR framer-12ejusb" role="presentation" viewBox="0 0 24 24" style={{ "--1ww558a": "1", "--4rxgx6": "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))" } as React.CSSProperties}>
                          <use href="#2047441354" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="framer-4zw6cy">
                  <div className="framer-1flg1rw">
                    <div className="framer-1almael-container" style={{ overflow: "hidden" }}>
                      <div style={{ maxWidth: "100%", width: "100%", overflow: "hidden" }}>
                        <FadeText index={index} dir={dir}>
                          <p
                            style={{
                              margin: "0",
                              fontFamily: '"Inter", "Inter Placeholder", sans-serif',
                              fontSize: "16px",
                              fontStyle: "normal",
                              fontWeight: "600",
                              letterSpacing: "-0.01em",
                              lineHeight: "1.5em",
                              color: "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))",
                            }}
                          >
                            {slide.name}
                          </p>
                        </FadeText>
                      </div>
                    </div>
                  </div>
                  <div className="framer-nym039">
                    <div className="framer-1tj7cbc-container" style={{ overflow: "hidden" }}>
                      <div style={{ maxWidth: "100%", width: "100%", overflow: "hidden" }}>
                        <FadeText index={index} dir={dir}>
                          <p
                            style={{
                              margin: "0",
                              fontFamily: '"Inter", "Inter Placeholder", sans-serif',
                              fontSize: "14px",
                              fontStyle: "normal",
                              fontWeight: "400",
                              letterSpacing: "-0.02em",
                              lineHeight: "1.5em",
                              color: "var(--token-c6de8ea4-3684-4c2f-917e-fc3d1879d6b0, rgba(255, 255, 255, 0.65))",
                            }}
                          >
                            {slide.role}
                          </p>
                        </FadeText>
                      </div>
                    </div>
                  </div>
                </div>

                {isDesktop && (
                  <div className="framer-1exxfa5">
                    {DOT_KEYS.map((dot, i) => (
                      <div
                        key={dot}
                        className={dot}
                        style={{
                          backgroundColor: i === index - 1 ? DOT_ON : DOT_OFF,
                          borderBottomLeftRadius: "406px",
                          borderBottomRightRadius: "406px",
                          borderTopLeftRadius: "406px",
                          borderTopRightRadius: "406px",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="framer-1styv7v">
          <div className="framer-1fvdxub">
            <div
              className="framer-jadtha"
              data-border="true"
              style={{
                "--border-bottom-width": "1px",
                "--border-color": "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                "--border-left-width": "1px",
                "--border-right-width": "1px",
                "--border-style": "solid",
                "--border-top-width": "1px",
                backgroundColor: "var(--token-ef8ecd6d-5204-4f29-b3b7-2d4dc011513a, rgb(0, 0, 0))",
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              } as React.CSSProperties}
            >
              {LAYER_ORDER.map((n) => (
                <SlideLayer key={SLIDES[n].layer} slide={SLIDES[n]} active={index === n + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [index, setIndex] = useState(1);
  const [dir, setDir] = useState<"up" | "down">("up");

  const prev = () => {
    setDir("down");
    setIndex((i) => (i === 1 ? SLIDES.length : i - 1));
  };

  const next = () => {
    setDir("up");
    setIndex((i) => (i === SLIDES.length ? 1 : i + 1));
  };

  return (
    <section className="framer-1oe83xk" data-border="true" data-framer-name="Testimonials">
      <div className="framer-11ydnsr" data-framer-name="content">
        <div className="framer-nja6tm" id="4-6">
          <div className="framer-17hk9yl">
            <div className="ssr-variant">
              <div className="framer-bos7rj-container" style={{ willChange: "transform", opacity: "0", transform: "translateY(24px)" }}>
                <a
                  className="framer-l6iRm framer-knjRQ framer-1uiucns framer-v-1uiucns framer-1dkgg6h"
                  data-border="true"
                  data-framer-name="Chip"
                  style={{
                    "--1x5nw16": "4px 16px 4px 16px",
                    "--border-bottom-width": "1px",
                    "--border-color": "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                    "--border-left-width": "1px",
                    "--border-right-width": "1px",
                    "--border-style": "solid",
                    "--border-top-width": "1px",
                    backgroundColor: "var(--token-aecd04de-bd30-4743-90e2-2b56d3d58e1b, var(--pw-line, rgba(255, 255, 255, 0.1)))",
                    borderBottomLeftRadius: "393px",
                    borderBottomRightRadius: "393px",
                    borderTopLeftRadius: "393px",
                    borderTopRightRadius: "393px",
                  } as React.CSSProperties}
                >
                  <div
                    className="framer-10cfw4u"
                    style={{
                      backgroundColor: "var(--token-090acfc6-f7ee-4bf4-9b69-0b15cf2cb187, rgb(255, 243, 240))",
                      willChange: "transform",
                      borderBottomLeftRadius: "215px",
                      borderBottomRightRadius: "215px",
                      borderTopLeftRadius: "215px",
                      borderTopRightRadius: "215px",
                      opacity: "1",
                      transform: "none",
                    }}
                  />
                  <div className="framer-1n35c0f" style={{ mask: "none", WebkitMask: "none" }}>
                    <div
                      className="framer-r48zlf"
                      data-framer-component-type="RichTextContainer"
                      style={{
                        "--extracted-r6o4lv": "var(--variable-reference-Dh_X3w3jZ-m54zGBZ4w)",
                        "--variable-reference-Dh_X3w3jZ-m54zGBZ4w":
                          "var(--token-792af9ed-53d8-45b2-94fd-014e7edc8f44, rgba(255, 255, 255, 0.8))",
                        transform: "none",
                      } as React.CSSProperties}
                    >
                      <p
                        className="framer-text framer-styles-preset-1fhxhj6"
                        data-styles-preset="O0790qsZT"
                        dir="auto"
                        style={{
                          "--framer-text-alignment": "center",
                          "--framer-text-color": "var(--extracted-r6o4lv, var(--variable-reference-Dh_X3w3jZ-m54zGBZ4w))",
                        } as React.CSSProperties}
                      >
                        Skenario
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
            <div className="framer-18qjsx7" data-framer-component-type="RichTextContainer" style={{ willChange: "transform", opacity: "0", transform: "translateY(24px)" }}>
              <h2 className="framer-text framer-styles-preset-fahce0" data-styles-preset="nZtZfLTSW" dir="auto">
                Yang orang hadapi di dunia nyata
              </h2>
            </div>
          </div>
          <div className="framer-1n3fj6y">
            <div className="framer-77429u" data-framer-component-type="RichTextContainer" style={{ willChange: "transform", opacity: "0", transform: "translateY(24px)" }}>
              <p className="framer-text framer-styles-preset-prenqk" data-styles-preset="POYKcChXw" dir="auto">
                Kutipan berikut adalah skenario ilustrasi, bukan klaim pelanggan. Semuanya disusun dari pola penipuan yang ada di modul.
              </p>
            </div>
          </div>
        </div>

        <div className="ssr-variant hidden-3job37 hidden-nzvz5l">
          <Copy kind="desktop" index={index} dir={dir} onPrev={prev} onNext={next} />
        </div>
        <div className="ssr-variant hidden-kj696b hidden-nzvz5l">
          <Copy kind="tablet" index={index} dir={dir} onPrev={prev} onNext={next} />
        </div>
        <div className="ssr-variant hidden-3job37 hidden-kj696b">
          <Copy kind="mobile" index={index} dir={dir} onPrev={prev} onNext={next} />
        </div>
      </div>
    </section>
  );
}

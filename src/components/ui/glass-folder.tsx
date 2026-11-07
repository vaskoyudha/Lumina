"use client";

import * as React from "react";

const W = 340;
const FRONT_TOP = 74;
const HEADROOM = 54;
const MARGIN = 20;

const backPath = (h: number) =>
  `M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 ${h - 22}A22 22 0 0 1 318 ${h}L22 ${h}A22 22 0 0 1 0 ${h - 22}Z`;

const frontPath = (frontH: number) =>
  `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${frontH - 22}A22 22 0 0 1 318 ${frontH}L22 ${frontH}A22 22 0 0 1 0 ${frontH - 22}Z`;

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function makeFbm(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  const p: number[] = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2;
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const h00 = perm[X + perm[Y]] * 2;
    const h10 = perm[X + 1 + perm[Y]] * 2;
    const h01 = perm[X + perm[Y + 1]] * 2;
    const h11 = perm[X + 1 + perm[Y + 1]] * 2;
    const d00 = grad[h00] * xf + grad[h00 + 1] * yf;
    const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
    const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
    const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    return (
      d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00))
    );
  };
  return (x: number, y: number) => {
    let sum = 0;
    let amp = 0.5;
    for (let i = 0; i < 4; i++) {
      sum += amp * noise(x, y);
      const nx = 1.6 * x + 1.2 * y + 7.1;
      y = -1.2 * x + 1.6 * y + 3.3;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

type ArtJob = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  step: (rows: number) => boolean;
};

function createArtJob(
  width: number,
  height: number,
  colors: string[],
  seed: number,
): ArtJob {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const palette = colors.length >= 2 ? colors : ["#ea580c", "#fff2e6"];
  const stops = palette.map((c, i) => ({
    t: i / (palette.length - 1),
    c: hexToRgb(c),
  }));
  const fbm = makeFbm(seed * 977 + 13);
  const r = rng(seed + 1);
  const ox = r() * 50;
  const oy = r() * 50;
  const scale = 0.78;
  const warp = 3.2;
  const gloss = 0.55;
  const angle = -0.5 + (r() - 0.5) * 0.5;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const m = Math.min(w, h);
  const gw = Math.ceil(w / 2) + 3;
  const gh = Math.ceil(h / 2) + 3;
  const G = new Float32Array(gw * gh);
  const GQ = new Float32Array(gw * gh);
  const F = new Float32Array(w * h);
  const Q = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  let row = 0;

  const field = (gy: number) => {
    for (let gx = 0; gx < gw; gx++) {
      const u = ((gx - 1) * 2 - w / 2) / m;
      const v = ((gy - 1) * 2 - h / 2) / m;
      const px = (u * ca - v * sa) * scale + ox;
      const py = (u * sa + v * ca) * scale + oy;
      const qx = fbm(px, py);
      const qy = fbm(px + 5.2, py + 1.3);
      const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2);
      const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8);
      G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry);
      GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
    }
  };

  const upsample = () => {
    const cr = (a: number, b: number, c: number, d: number) =>
      (-a + 9 * b + 9 * c - d) / 16;
    const T = new Float32Array(w * gh);
    for (let gy = 0; gy < gh; gy++) {
      const r0 = gy * gw;
      for (let x = 0; x < w; x++) {
        const c = (x >> 1) + 1;
        T[gy * w + x] =
          x & 1
            ? cr(G[r0 + c - 1], G[r0 + c], G[r0 + c + 1], G[r0 + c + 2])
            : G[r0 + c];
      }
    }
    for (let y = 0; y < h; y++) {
      const c = (y >> 1) + 1;
      for (let x = 0; x < w; x++) {
        F[y * w + x] =
          y & 1
            ? cr(
                T[(c - 1) * w + x],
                T[c * w + x],
                T[(c + 1) * w + x],
                T[(c + 2) * w + x],
              )
            : T[c * w + x];
        const gx = (x >> 1) + 1;
        const q0 = GQ[c * gw + gx];
        const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
        const q1 =
          y & 1
            ? x & 1
              ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2
              : GQ[(c + 1) * gw + gx]
            : qx;
        Q[y * w + x] = (qx + q1) / 2;
      }
    }
  };

  const colorize = () => {
    const sample: number[] = [];
    const stride = Math.max(1, Math.floor(F.length / 4096));
    for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.02)];
    const hi = sample[Math.floor(sample.length * 0.98)];
    const k = 1 / (hi - lo || 1);
    const lx = -0.55;
    const ly = -0.65;
    const lz = 0.52;
    const slope = k * m * 0.012;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let t = (F[i] - lo) * k;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let j = 1;
        while (j < stops.length - 1 && stops[j].t < t) j++;
        const a = stops[j - 1];
        const b = stops[j];
        let f = (t - a.t) / (b.t - a.t || 1);
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        f = f * f * (3 - 2 * f);
        const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
        const gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
        const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
        const spec = (nd > 0 ? nd : 0) ** 24 * gloss * 255;
        const silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
        const vein = Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.35;
        const lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
        pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
        pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
        pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
        pixels[i * 4 + 3] = 255;
      }
    }
  };

  const step = (rows: number): boolean => {
    if (row >= gh) return true;
    const end = Math.min(gh, row + Math.max(1, rows));
    while (row < end) field(row++);
    if (row < gh) return false;
    upsample();
    colorize();
    return true;
  };

  return { width: w, height: h, pixels, step };
}

const ART_TOKENS = [
  "--lumina-brand-line",
  "--lumina-brand-soft",
  "--lumina-brand-glow",
  "--lumina-brand",
  "--lumina-brand-strong",
  "--lumina-brand-ink",
  "--lumina-txt",
];

const readArtColors = (el: HTMLElement) => {
  const style = getComputedStyle(el);
  const out: string[] = [];
  for (const name of ART_TOKENS) {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    probe.style.display = "none";
    el.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    const match = value.match(/\d+(\.\d+)?/g);
    if (!match || match.length < 3) continue;
    const [r, g, b] = match.map(Number);
    out.push(
      `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`,
    );
  }
  void style;
  return out;
};

function FolderArtCanvas({
  height,
  density,
}: {
  height: number;
  density: number;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const pw = Math.round((W + 24) * density);
    const ph = Math.round((height + 24) * density);
    const job = createArtJob(pw, ph, readArtColors(canvas), 7);
    let raf = 0;
    let live = true;
    const tick = () => {
      if (!live) return;
      if (job.step(Math.max(4, Math.round(ph / 26)))) {
        canvas.width = job.width;
        canvas.height = job.height;
        canvas
          .getContext("2d")
          ?.putImageData(
            new ImageData(
              new Uint8ClampedArray(job.pixels),
              job.width,
              job.height,
            ),
            0,
            0,
          );
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, [height, density]);

  return (
    <canvas
      ref={ref}
      className="gf-art"
      data-ready={ready || undefined}
      style={{ width: W + 24, height: height + 24 }}
    />
  );
}

export type GlassFolderProps = {
  label: string;
  meta?: string;
  height?: number;
  width?: number;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
  keySlot?: React.ReactNode;
};

export function GlassFolder({
  label,
  meta,
  height = 272,
  width = 340,
  className,
  contentClassName,
  children,
  keySlot,
}: GlassFolderProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [entered, setEntered] = React.useState(false);
  const k = width / W;
  const frontH = height - FRONT_TOP;

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        root.style.setProperty("--gf-px", px.toFixed(3));
        root.style.setProperty("--gf-py", py.toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      root.style.setProperty("--gf-px", "0");
      root.style.setProperty("--gf-py", "0");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    const enter = requestAnimationFrame(() => setEntered(true));
    return () => {
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(enter);
    };
  }, []);

  const density = Math.min(1.5, Math.max(1, k));

  return (
    <div
      ref={rootRef}
      data-entered={entered || undefined}
      className={`gf-root${className ? ` ${className}` : ""}`}
      style={{ width, height: height + HEADROOM * k }}
    >
      <style>{FOLDER_CSS}</style>
      <div
        className="gf-stage"
        style={{ transform: `translateY(${HEADROOM * k}px) scale(${k})` }}
      >
        <div className="gf-shadow" />

        <div
          className="gf-back"
          style={{ clipPath: `path('${backPath(height)}')` }}
        >
          <FolderArtCanvas height={height} density={density} />
          <div className="gf-back-sheen" />
        </div>

        <svg
          role="presentation"
          className="gf-rim gf-back-rim"
          viewBox={`${-MARGIN} ${-MARGIN} ${W + MARGIN * 2} ${height + MARGIN * 2}`}
        >
          <path d={backPath(height)} />
        </svg>

        <div
          className="gf-front"
          style={{
            height: frontH,
            clipPath: `path('${frontPath(frontH)}')`,
          }}
        >
          <div className="gf-tint" />
          <div className="gf-spec" />
          <svg
            role="presentation"
            className="gf-rim gf-front-rim"
            viewBox={`${-MARGIN} ${-MARGIN} ${W + MARGIN * 2} ${frontH + MARGIN * 2}`}
          >
            <defs>
              <linearGradient id="gf-rim" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0"
                  stopColor="var(--lumina-panel)"
                  stopOpacity="0.95"
                />
                <stop
                  offset="0.35"
                  stopColor="var(--lumina-panel)"
                  stopOpacity="0.35"
                />
                <stop
                  offset="1"
                  stopColor="var(--lumina-panel)"
                  stopOpacity="0.12"
                />
              </linearGradient>
            </defs>
            <path d={frontPath(frontH)} stroke="url(#gf-rim)" />
          </svg>

          <div className={`gf-content ${contentClassName ?? ""}`}>
            {children}
          </div>

          <div className="gf-label">
            <span className="gf-title">{label}</span>
            {meta ? <span className="gf-meta">{meta}</span> : null}
          </div>

          {keySlot}
        </div>
      </div>
    </div>
  );
}

const FOLDER_CSS = `
.gf-root {
  --gf-ease: cubic-bezier(.2, .8, .2, 1);
  --gf-spring: cubic-bezier(.34, 1.36, .5, 1);
  --gf-px: 0;
  --gf-py: 0;
  position: relative;
  display: inline-block;
  flex: none;
  vertical-align: top;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  isolation: isolate;
}
.gf-stage {
  position: absolute;
  left: 0;
  top: 0;
  width: 340px;
  height: 326px;
  transform-origin: 0 0;
}
.gf-shadow {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: -8px;
  height: 64px;
  border-radius: 40px;
  background: color-mix(in oklab, var(--lumina-txt) 34%, transparent);
  filter: blur(22px);
  transition: opacity .9s var(--gf-ease);
}
.gf-back {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(180deg, var(--lumina-panel) 0%, var(--lumina-panel-2) 100%);
}
.gf-art {
  position: absolute;
  left: -12px;
  top: -12px;
  max-width: none;
  object-fit: cover;
  transition: opacity 1.2s var(--gf-ease), filter 1.2s var(--gf-ease), transform .9s var(--gf-ease);
  transform: translate(calc(var(--gf-px) * -7px), calc(var(--gf-py) * -6px)) scale(1.02);
}
canvas.gf-art { opacity: 0; filter: blur(14px) saturate(.6); }
canvas.gf-art[data-ready] { opacity: 1; filter: none; }
.gf-back-sheen {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--lumina-panel) 24%, transparent) 0%, transparent 24%),
    radial-gradient(120% 80% at 80% 0%, color-mix(in oklab, var(--lumina-panel) 18%, transparent), transparent 60%);
  pointer-events: none;
}
.gf-rim {
  position: absolute;
  left: 0;
  top: 0;
  width: 340px;
  height: 100%;
  max-width: none;
  overflow: visible;
  pointer-events: none;
  fill: none;
}
.gf-back-rim path {
  stroke: color-mix(in oklab, var(--lumina-panel) 48%, transparent);
  stroke-width: 1;
}
.gf-front {
  position: absolute;
  left: 0;
  top: 74px;
  width: 340px;
  z-index: 10;
  -webkit-backdrop-filter: blur(22px) saturate(1.5);
  backdrop-filter: blur(22px) saturate(1.5);
  transform: perspective(760px) rotateX(calc(-3deg + var(--gf-py) * 2deg)) rotateY(calc(var(--gf-px) * 2.4deg));
  transition: transform .8s var(--gf-spring), translate 1s var(--gf-ease), opacity 1s var(--gf-ease);
  border-radius: 22px;
}
.gf-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--lumina-panel) 18%, transparent) 0%,
    color-mix(in oklab, var(--lumina-panel) 66%, transparent) 38%,
    color-mix(in oklab, var(--lumina-panel) 90%, transparent) 66%,
    color-mix(in oklab, var(--lumina-panel) 97%, transparent) 100%);
  pointer-events: none;
}
.gf-spec {
  position: absolute;
  inset: 0;
  background: radial-gradient(260px 200px at calc(50% + var(--gf-px) * 46%) calc(30% + var(--gf-py) * 40%),
    color-mix(in oklab, var(--lumina-panel) 60%, transparent), transparent 70%);
  mix-blend-mode: soft-light;
  opacity: .9;
  pointer-events: none;
}
.gf-front-rim path { stroke-width: 2.4; }
.gf-content {
  position: absolute;
  inset: 0 0 86px;
  z-index: 2;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 42px 22px 6px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--lumina-txt) 22%, transparent) transparent;
}
.gf-label {
  position: absolute;
  left: 28px;
  bottom: 28px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 200px;
  pointer-events: none;
  color: var(--lumina-txt);
}
.gf-title {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -.012em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gf-meta {
  font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: .02em;
  color: var(--lumina-dim);
  white-space: nowrap;
  animation: gf-roll .5s var(--gf-ease);
}
.gf-key {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 12;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--lumina-panel);
  background: radial-gradient(120% 90% at 50% 0%,
    var(--lumina-ink-soft) 0%, var(--lumina-ink) 55%, var(--lumina-brand-strong) 160%);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--lumina-panel) 22%, transparent),
    inset 0 -3px 8px color-mix(in oklab, var(--lumina-ink) 70%, transparent),
    0 0 0 1px color-mix(in oklab, var(--lumina-ink) 75%, transparent),
    0 14px 22px -8px color-mix(in oklab, var(--lumina-ink) 55%, transparent),
    0 3px 6px -2px color-mix(in oklab, var(--lumina-ink) 35%, transparent);
  transition: transform .35s var(--gf-spring), box-shadow .35s var(--gf-ease), opacity .6s var(--gf-ease) .7s, scale .7s var(--gf-spring) .7s;
}
.gf-key:hover { transform: translateY(-2px); }
.gf-key:active { transform: translateY(0) scale(.93); transition-duration: .12s; }
.gf-key:focus-visible { outline: 2px solid var(--lumina-brand); outline-offset: 3px; }
.gf-key svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gf-root:not([data-entered]) .gf-front { translate: 0 46px; opacity: 0; }
.gf-root:not([data-entered]) .gf-key { opacity: 0; scale: .6; }
.gf-root:not([data-entered]) .gf-shadow { opacity: 0; }
.gf-root[data-entered] .gf-front { transition-delay: 0s, .42s, .42s; }
@keyframes gf-roll {
  from { opacity: 0; translate: 0 7px; filter: blur(3px); }
  to { opacity: 1; translate: 0 0; filter: blur(0); }
}
@media (prefers-reduced-motion: reduce) {
  .gf-root, .gf-root * {
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    animation: none !important;
  }
  .gf-front { transform: none; }
  .gf-art { transform: none; }
}
`;

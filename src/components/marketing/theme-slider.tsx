"use client";

import { Coffee, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const THEMES = [
  { id: "warm", label: "Hangat", Icon: Sun },
  { id: "black", label: "Gelap", Icon: Moon },
  { id: "cream", label: "Krem", Icon: Coffee },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "lumina-theme";

function isTheme(value: string | null): value is ThemeId {
  return value === "warm" || value === "black" || value === "cream";
}

const TOP_TONE = "border-white/25 bg-black/25 text-amberwarm-100/70";
const SCROLLED_TONE = "border-ls-line bg-ls-card/70 text-ls-ink-3";

const TOP_ACTIVE = "bg-amberwarm-50 text-espresso-950";
const SCROLLED_ACTIVE = "bg-ls-solid text-ls-solid-ink";

export function ThemeSlider({ scrolled = false }: { scrolled?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeId>("warm");

  useEffect(() => {
    const landing = rootRef.current?.closest(".landing");
    const current = landing?.getAttribute("data-theme") ?? null;
    if (isTheme(current)) {
      setTheme(current);
      return;
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isTheme(saved)) {
        landing?.setAttribute("data-theme", saved);
        setTheme(saved);
      }
    } catch {
      // Private mode: keep the default warm theme.
    }
  }, []);

  useEffect(() => {
    const landing = rootRef.current?.closest(".landing");
    if (!landing) return;
    const observer = new MutationObserver(() => {
      const next = landing.getAttribute("data-theme");
      if (isTheme(next)) setTheme(next);
    });
    observer.observe(landing, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  function apply(next: ThemeId) {
    setTheme(next);
    rootRef.current?.closest(".landing")?.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the in-session theme still applies.
    }
  }

  const activeIndex = Math.max(
    0,
    THEMES.findIndex((item) => item.id === theme),
  );

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Tema tampilan"
      data-pressable
      className={`relative flex items-center rounded-full border p-1 backdrop-blur-md transition-colors duration-300 ${
        scrolled ? SCROLLED_TONE : TOP_TONE
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1 left-1 h-11 w-11 rounded-full shadow-sm transition-[transform,background-color,color] duration-300 ease-out ${
          scrolled ? SCROLLED_ACTIVE : TOP_ACTIVE
        }`}
        style={{ transform: `translateX(${activeIndex * 2.75}rem)` }}
      />
      {THEMES.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={`Tema ${label}`}
            aria-pressed={active}
            title={`Tema ${label}`}
            onClick={() => apply(id)}
            className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ease-out ${
              active ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

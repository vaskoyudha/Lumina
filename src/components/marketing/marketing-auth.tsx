"use client";

import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";

const SIGNED_OUT_TONE = {
  masuk: "text-amberwarm-100/90 hover:text-white",
  daftar: "bg-amberwarm-50 text-espresso-950 hover:bg-amberwarm-100",
};

const SCROLLED_TONE = {
  masuk: "text-espresso-950 hover:text-espresso-700",
  daftar: "bg-espresso-950 text-white hover:bg-espresso-800",
};

export function MarketingAuth({ scrolled = false }: { scrolled?: boolean }) {
  const [tab, setTab] = useState<AuthTab | null>(null);
  const tone = scrolled ? SCROLLED_TONE : SIGNED_OUT_TONE;

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        data-pressable
        aria-haspopup="dialog"
        onClick={() => setTab("masuk")}
        className={`inline-flex min-h-11 items-center rounded-full px-2.5 text-xs font-medium transition-[background-color,color] duration-150 ease-out sm:px-3 sm:text-sm ${tone.masuk}`}
      >
        Masuk
      </button>
      <button
        type="button"
        data-pressable
        aria-haspopup="dialog"
        onClick={() => setTab("daftar")}
        className={`inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold shadow-md transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] sm:px-4 sm:text-sm ${tone.daftar}`}
      >
        Daftar
      </button>

      <AuthDialog
        open={tab !== null}
        onOpenChange={(open) => {
          if (!open) setTab(null);
        }}
        defaultTab={tab ?? "masuk"}
      />
    </div>
  );
}

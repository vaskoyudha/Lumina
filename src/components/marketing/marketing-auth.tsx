"use client";

import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";

const TONE = {
  masuk: "text-ls-ink hover:text-ls-ink-2",
  daftar: "bg-ls-solid text-ls-solid-ink hover:bg-ls-solid-hover",
};

export function MarketingAuth() {
  const [tab, setTab] = useState<AuthTab | null>(null);

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        data-pressable
        aria-haspopup="dialog"
        onClick={() => setTab("masuk")}
        className={`inline-flex min-h-11 items-center rounded-full px-2.5 text-xs font-medium transition-[background-color,color] duration-150 ease-out sm:px-3 sm:text-sm ${TONE.masuk}`}
      >
        Masuk
      </button>
      <button
        type="button"
        data-pressable
        aria-haspopup="dialog"
        onClick={() => setTab("daftar")}
        className={`inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold shadow-md transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] sm:px-4 sm:text-sm ${TONE.daftar}`}
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

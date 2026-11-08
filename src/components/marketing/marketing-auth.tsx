"use client";

import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";
import { DaftarButton } from "@/components/auth/daftar-button";

const TONE = {
  masuk: "text-ls-ink hover:text-ls-ink-2",
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
      <DaftarButton onClick={() => setTab("daftar")} />

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

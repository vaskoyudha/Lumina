"use client";

import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";
import { DaftarButton } from "@/components/auth/daftar-button";
import { UserMenu } from "@/components/auth/user-menu";

type Session = { nama: string; email: string } | null;

/**
 * The auth affordance at the far right of a product navbar.
 *
 * Signed in, it is the existing account menu. Signed out, it is a trigger pair
 * that opens the frosted dialog rather than navigating to `/masuk`: the reader
 * keeps whatever they were reading, and the full page stays as the fallback for
 * anyone who lands on that URL directly.
 */
export function AuthNav({
  session,
  compact = false,
}: {
  session?: Session;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<AuthTab | null>(null);

  if (session) return <UserMenu nama={session.nama} email={session.email} />;

  return (
    <div
      className={
        compact
          ? "flex shrink-0 items-center gap-1.5"
          : "flex shrink-0 items-center gap-1"
      }
    >
      <button
        type="button"
        data-pressable
        onClick={() => setTab("masuk")}
        className={
          compact
            ? "inline-flex h-[32px] items-center rounded-full bg-chip px-3 font-medium text-[12px] text-ink-soft transition-colors duration-150 ease-out hover:bg-chip-hover hover:text-ink"
            : "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-dim text-sm transition-[background-color,color] duration-150 ease-out hover:bg-panel-2 hover:text-txt"
        }
      >
        Masuk
      </button>
      <DaftarButton
        size={compact ? "sm" : "md"}
        onClick={() => setTab("daftar")}
        className={compact ? "hidden sm:inline-flex" : undefined}
      />

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

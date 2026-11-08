"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthDialog, type AuthTab } from "@/components/auth/auth-dialog";
import { DaftarButton } from "@/components/auth/daftar-button";
import { cn } from "@/lib/utils";

export interface CompanionSession {
  nama: string;
  email: string;
}

function initialsFor(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

/**
 * Account entry for the chat sidebar.
 *
 * Signed out it offers the two actions as a card above the privacy promise,
 * matching the footer card's weight instead of adding a second navigation
 * block. Collapsed to the 60px rail it becomes one square button, because a
 * two-action card cannot fit in a stripe.
 */
export function CompanionAuth({
  session,
  iconsOnly = false,
}: {
  session: CompanionSession | null;
  iconsOnly?: boolean;
}) {
  const [tab, setTab] = useState<AuthTab | null>(null);

  const dialog = (
    <AuthDialog
      open={tab !== null}
      onOpenChange={(open) => {
        if (!open) setTab(null);
      }}
      defaultTab={tab ?? "masuk"}
    />
  );

  if (iconsOnly) {
    return (
      <>
        {session ? (
          <Link
            href="/profil"
            data-pressable
            aria-label={`Profil ${session.nama}`}
            title={session.nama}
            className="grid size-9 place-items-center rounded-full bg-brand-soft font-semibold text-[11px] text-brand-ink transition-[background-color,color] duration-150 ease-out hover:bg-brand-soft-2"
          >
            {initialsFor(session.nama)}
          </Link>
        ) : (
          <button
            type="button"
            data-pressable
            aria-haspopup="dialog"
            aria-label="Masuk atau daftar"
            title="Masuk atau daftar"
            onClick={() => setTab("masuk")}
            className="grid size-9 place-items-center rounded-[7px] text-ink-soft transition-[background-color,color] duration-150 ease-out hover:bg-txt/6 hover:text-ink"
          >
            <LogIn aria-hidden strokeWidth={1.75} className="size-[15px]" />
          </button>
        )}
        {dialog}
      </>
    );
  }

  if (session) {
    return (
      <Link
        href="/profil"
        data-pressable
        aria-label={`Profil ${session.nama}`}
        className="mb-2 flex items-center gap-2.5 rounded-[12px] border border-hairline bg-panel p-2 shadow-rest transition-[background-color,box-shadow] duration-150 ease-out hover:bg-chip"
      >
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-brand-soft font-semibold text-[11px] text-brand-ink">
          {initialsFor(session.nama)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[11.5px] leading-[1.3] text-txt">
            {session.nama}
          </span>
          <span className="block truncate font-light text-[10.5px] leading-[1.4] text-ink-faint">
            {session.email}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          data-pressable
          aria-haspopup="dialog"
          onClick={() => setTab("masuk")}
          className={cn(
            "flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] border border-hairline bg-panel font-medium text-[11.5px] text-ink-soft",
            "transition-[background-color,border-color,color] duration-150 ease-out",
            "hover:border-edge hover:bg-chip hover:text-ink",
          )}
        >
          <LogIn aria-hidden strokeWidth={1.8} className="size-3.5" />
          Masuk
        </button>
        <DaftarButton size="xs" onClick={() => setTab("daftar")} />
      </div>
      {dialog}
    </>
  );
}

"use client";

import {
  Briefcase,
  GraduationCap,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAccountProgress } from "@/components/belajar/account-progress-context";
import {
  AccountPanel,
  type SettingsSession,
} from "@/components/profil/settings-account-panel";
import { JobsPanel } from "@/components/profil/settings-jobs-panel";
import { ProgressPanel } from "@/components/profil/settings-progress-panel";
import { SecurityPanel } from "@/components/profil/settings-security-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountPayload, AccountView } from "@/lib/auth/account-view";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { MODUS } from "@/lib/modus";
import { BADGE_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";

export type ProfileSection = "profil" | "kemajuan" | "loker" | "privasi";

const SECTIONS: Array<{
  id: ProfileSection;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "profil", label: "Akun", icon: UserRound },
  { id: "kemajuan", label: "Kemajuan", icon: GraduationCap },
  { id: "loker", label: "Lowongan", icon: Briefcase },
  { id: "privasi", label: "Privasi & keamanan", icon: ShieldCheck },
];

const COPY: Record<ProfileSection, { title: string; description: string }> = {
  profil: {
    title: "Akun",
    description: "Identitas akun dan sesi yang sedang aktif.",
  },
  kemajuan: {
    title: "Kemajuan belajar",
    description: "Modul dan lencana yang tersimpan di akunmu.",
  },
  loker: {
    title: "Lowongan tersimpan",
    description: "Lowongan yang kamu simpan di perangkat ini.",
  },
  privasi: {
    title: "Privasi & keamanan",
    description: "Apa yang disimpan dan bagaimana sesi bekerja.",
  },
};

export function ProfileDialog({
  session,
  section,
  onOpenChange,
}: {
  session: SettingsSession;
  section: ProfileSection | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [active, setActive] = useState<ProfileSection>("profil");
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { progress, modules } = useAccountProgress();
  const { saved } = useSavedLoker();

  const done = progress?.completedModules.length ?? 0;
  const total = modules.length || MODUS.length;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const badges = Object.entries(BADGE_LABEL)
    .filter(([id]) => progress?.badges.includes(id))
    .map(([, label]) => label);

  useEffect(() => {
    if (section) setActive(section);
  }, [section]);

  useEffect(() => {
    if (section === null) return;
    if (typeof fetch !== "function") return;
    let alive = true;
    setLoadError(null);
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("account");
        return (await response.json()) as AccountPayload;
      })
      .then((data) => {
        if (!alive) return;
        setAccount(data.account ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(
          "Pengaturan akun tidak dapat dimuat. Tutup lalu buka lagi.",
        );
      });
    return () => {
      alive = false;
    };
  }, [section]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !backward && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    let next = index;
    if (forward) next = (index + 1) % SECTIONS.length;
    if (backward) next = (index - 1 + SECTIONS.length) % SECTIONS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = SECTIONS.length - 1;
    setActive(SECTIONS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Dialog open={section !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block h-[min(44rem,calc(100dvh-2rem))] w-[min(64rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-3xl border-0 bg-background p-0 shadow-2xl ring-0 sm:max-w-none"
      >
        <DialogDescription className="sr-only">
          Kelola identitas akun, password, dan sesi yang aktif.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-line border-b px-5">
            <DialogTitle className="font-heading font-medium text-base">
              Pengaturan
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup pengaturan"
                className="rounded-full"
              >
                <X aria-hidden />
              </Button>
            </DialogClose>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[13.5rem_minmax(0,1fr)] md:grid-rows-1">
            <div
              role="tablist"
              aria-label="Bagian pengaturan"
              aria-orientation="vertical"
              className="grid grid-cols-2 gap-1 border-line border-b p-2 md:flex md:flex-col md:border-r md:border-b-0"
            >
              {SECTIONS.map((item, index) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`settings-tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls={`settings-panel-${item.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(item.id)}
                    onKeyDown={(event) => moveTab(event, index)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                      selected
                        ? "bg-panel font-medium text-txt shadow-rest"
                        : "text-dim hover:bg-panel-2/60 hover:text-txt",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {loadError ? (
                <Alert role="alert" variant="destructive" className="mb-4">
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              ) : null}

              {SECTIONS.map((item) => (
                <section
                  key={item.id}
                  role="tabpanel"
                  id={`settings-panel-${item.id}`}
                  aria-labelledby={`settings-tab-${item.id}`}
                  hidden={active !== item.id}
                  className="flex flex-col gap-5"
                >
                  <header>
                    <h2 className="font-heading font-medium text-lg text-txt">
                      {COPY[item.id].title}
                    </h2>
                    <p className="mt-1 text-dim text-sm">
                      {COPY[item.id].description}
                    </p>
                  </header>
                  {item.id === "profil" ? (
                    <AccountPanel session={session} account={account} />
                  ) : null}
                  {item.id === "kemajuan" ? (
                    <ProgressPanel
                      done={done}
                      total={total}
                      pct={pct}
                      badges={badges}
                    />
                  ) : null}
                  {item.id === "loker" ? (
                    <JobsPanel savedCount={saved.length} />
                  ) : null}
                  {item.id === "privasi" ? <SecurityPanel /> : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

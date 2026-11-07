"use client";

import { X } from "lucide-react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { scrollToId } from "@/lib/scroll";
import { drawerLinks } from "@/lib/site";

export function QuickDrawer() {
  const { drawerOpen, closeDrawer } = useSite();

  return (
    <Sheet
      open={drawerOpen}
      onOpenChange={(open) => {
        if (!open) closeDrawer();
      }}
    >
      <SheetContent
        id="quick-drawer"
        side="right"
        showCloseButton={false}
        aria-label="Menu navigasi cepat"
        className="w-72 max-w-full gap-0 border-l-0 bg-espresso-950 p-0 text-white shadow-2xl sm:max-w-none"
      >
        <div className="flex h-full flex-col justify-between overflow-y-auto p-6">
          <div>
            <div className="flex items-center justify-between border-white/10 border-b pb-5">
              <SheetTitle className="flex items-center">
                <LuminaLogo tone="onDark" className="h-7 w-auto" />
              </SheetTitle>
              <Button
                id="close-quick-drawer"
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Tutup menu navigasi"
                onClick={closeDrawer}
                className="size-8 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Pintasan menuju bagian halaman utama Lumina.
            </SheetDescription>

            <div className="mt-6 space-y-2 text-sm">
              {drawerLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    scrollToId(link.id);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left hover:bg-white/10"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
            <div className="font-semibold text-amberwarm-300">
              Butuh langkah mendesak?
            </div>
            <p className="text-amberwarm-100/75">
              Kalau uang sudah terkirim atau OTP sudah diberikan, buka jalur
              darurat dan ikuti satu tindakan per langkah.
            </p>
            <a
              href="/darurat"
              className="inline-flex min-h-9 items-center font-semibold text-amberwarm-200 underline-offset-4 hover:underline"
            >
              Buka mode darurat
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

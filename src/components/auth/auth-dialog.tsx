"use client";

import { X } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignInPage } from "@/components/auth/sign-in-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type AuthTab = "masuk" | "daftar";

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = "masuk",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AuthTab;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block h-[min(760px,calc(100dvh-2rem))] w-[min(1120px,calc(100vw-2rem))] max-w-none overflow-hidden rounded-3xl border-0 bg-background p-0 shadow-2xl ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Masuk ke Lumina</DialogTitle>
        <DialogDescription className="sr-only">
          Daftar atau masuk dengan Google maupun email dan password.
        </DialogDescription>

        <SignInPage
          title={<span className="font-light">Selamat datang</span>}
          description="Masuk dengan Google atau email. Progres belajar dan hasil simulasi tersimpan di akunmu."
        >
          <AuthPanel
            key={defaultTab}
            defaultTab={defaultTab}
            variant="inline"
            demo
          />
        </SignInPage>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tutup dialog masuk dan daftar"
            className="absolute top-4 right-4 z-20 rounded-full bg-panel/80 text-txt shadow-rest backdrop-blur hover:bg-panel"
          >
            <X aria-hidden />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

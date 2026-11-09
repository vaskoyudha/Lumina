"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ProfileDialog,
  type ProfileSection,
} from "@/components/profil/profile-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth/actions";

/**
 * Shows the database session identity. The profile opens as floating cards in
 * place; there is still no avatar upload or editable settings.
 */
export function UserMenu({ nama, email }: { nama: string; email: string }) {
  const initial = nama.trim().charAt(0).toUpperCase() || "?";
  const [section, setSection] = useState<ProfileSection | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Akun ${nama}`}
            className="rounded-full"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-panel-2 text-xs text-txt">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block font-medium text-sm text-txt">{nama}</span>
              <span className="block truncate text-dim text-xs">{email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSection("profil")}>
            <UserRound aria-hidden className="size-4" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/masuk" className="flex items-center gap-2">
              Ganti akun
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 text-left"
              >
                <LogOut aria-hidden className="size-4" />
                Keluar
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        session={{ nama, email }}
        section={section}
        onOpenChange={(open) => {
          if (!open) setSection(null);
        }}
      />
    </>
  );
}

"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
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
 * Logged-in affordance in the app nav. Demo-scope: shows the name from the
 * signed cookie and the way to `/profil`, the device-only profile summary.
 * There are still no settings and no avatar upload — nothing to edit.
 */
export function UserMenu({ nama, email }: { nama: string; email: string }) {
  const initial = nama.trim().charAt(0).toUpperCase() || "?";

  return (
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
        <DropdownMenuItem asChild>
          <Link href="/profil" className="flex items-center gap-2">
            <UserRound aria-hidden className="size-4" />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/masuk" className="flex items-center gap-2">
            Ganti akun demo
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
  );
}

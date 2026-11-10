"use client";

import { Briefcase } from "lucide-react";
import { ProfilLoker } from "@/components/profil/profil-loker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JobsPanel({ savedCount }: { savedCount: number }) {
  return (
    <Card className="gap-0 rounded-xl py-0 ring-1 ring-line">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Briefcase aria-hidden className="size-4 text-brand" />
          {savedCount} lowongan tersimpan
        </CardTitle>
        <CardDescription>
          Daftar ini tersimpan di perangkat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <ProfilLoker />
      </CardContent>
    </Card>
  );
}

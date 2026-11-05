"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";

/**
 * Printed on /masuk so a judge never types a password.
 *
 * These credentials are literal constants in the repo — there is no secret here
 * to protect, because there is no account record anywhere. Naming them "demo"
 * in visible copy is what keeps the privacy promise honest.
 */
export function DemoAccountPicker({
  onFill,
}: {
  onFill: (email: string, password: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium text-sm text-txt">Akun demo</h2>
        <Badge variant="outline" className="text-dim text-xs">
          tanpa penyimpanan server
        </Badge>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li
            key={account.email}
            className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm text-txt">
                {account.nama}
              </p>
              <p className="truncate text-dim text-xs">
                {account.email} · {account.password}
              </p>
              <p className="mt-0.5 text-dim text-xs">{account.summary}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-line text-dim hover:text-txt"
              onClick={() => {
                onFill(account.email, account.password);
                setCopied(account.email);
              }}
            >
              <Copy data-icon="inline-start" aria-hidden />
              {copied === account.email ? "Terisi" : "Isi otomatis"}
            </Button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-dim text-xs leading-relaxed">
        Ini akun demo untuk penilaian. Hanya kredensial demo yang dikirim; tidak
        ada profil atau progres yang disimpan di server. Progres belajar
        tersimpan di perangkat ini.
      </p>
    </section>
  );
}

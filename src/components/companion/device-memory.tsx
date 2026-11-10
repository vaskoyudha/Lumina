"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  clearLedger,
  configureLedger,
  LEDGER_EVENT,
  ledgerStatus,
} from "@/lib/ledger";
export function DeviceMemory() {
  const [status, setStatus] = useState({ enabled: false, count: 0 });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        setStatus(ledgerStatus(localStorage));
      } catch {
        setError("Riwayat perangkat tidak tersedia.");
      }
    };
    refresh();
    window.addEventListener(LEDGER_EVENT, refresh);
    return () => window.removeEventListener(LEDGER_EVENT, refresh);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1 text-xs text-dim">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={status.enabled}
          onChange={(e) => {
            try {
              configureLedger(localStorage, e.target.checked);
              setStatus(ledgerStatus(localStorage));
              setError(null);
            } catch {
              setError("Riwayat perangkat tidak tersedia.");
            }
          }}
        />
        Riwayat perangkat ini
      </label>
      {status.enabled && (
        <>
          <span>{status.count} sidik entitas berisiko</span>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              try {
                clearLedger(localStorage);
                setStatus(ledgerStatus(localStorage));
              } catch {
                setError("Riwayat belum dapat dihapus.");
              }
            }}
          >
            Hapus riwayat perangkat
          </Button>
          <span>Hanya hash kontak/domain; isi pesan tidak disimpan.</span>
        </>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

"use client";

import { ArrowRight, FilePen, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  blankDraft,
  DRAFT_EVENT,
  type DraftStore,
  EMPTY_STORE,
  loadDrafts,
  nextCourseNo,
  removeDraft,
  upsertDraft,
  validateDraft,
} from "@/lib/admin/draft-store";
import type { LearningSummary } from "@/lib/content/schema";

export function AdminInventory({
  modules: MODUS,
}: {
  modules: LearningSummary[];
}) {
  const TAKEN_NUMBERS = MODUS.map((m) => m.no);
  const router = useRouter();
  const [store, setStore] = useState<DraftStore>(EMPTY_STORE);
  const [hydrated, setHydrated] = useState(false);
  // Create is a two-step action: the first click reveals the form so a name
  // can be typed, because the catalog renders `nama` and an unnamed course
  // would print as an empty row.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const reRead = useCallback(() => {
    setStore(loadDrafts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    reRead();
    window.addEventListener(DRAFT_EVENT, reRead);
    window.addEventListener("storage", reRead);
    return () => {
      window.removeEventListener(DRAFT_EVENT, reRead);
      window.removeEventListener("storage", reRead);
    };
  }, [reRead]);

  const rows = [...MODUS]
    .sort((a, b) => a.no - b.no)
    .map((m) => {
      const draft = store.courses.find((c) => c.no === m.no);
      const published = m.ready;
      // A draft that passes the same validation as import gets a direct route
      // to the publish steps. Invalid drafts keep "Lanjutkan" as the only
      // action, so the button never promises an export that would fail.
      const siap = draft ? validateDraft(draft) === null : false;
      return { ...m, draft, published, siap };
    });

  const extraDrafts = store.courses.filter(
    (c) => !MODUS.some((m) => m.no === c.no),
  );
  const publishedCount = rows.filter((r) => r.published).length;

  function handleCreate() {
    const no = nextCourseNo(TAKEN_NUMBERS);
    upsertDraft(blankDraft(no, { nama: newName.trim() }));
    setCreating(false);
    setNewName("");
    router.push(`/admin/${no}`);
  }

  function handleRemoveDraft(no: number) {
    removeDraft(no);
    reRead();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="appnext-caption tabular">
            {hydrated
              ? `${publishedCount} terbit · ${store.courses.length} draf di perangkat ini`
              : "Membaca draf di perangkat ini…"}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreating((open) => !open)}
          aria-expanded={creating}
          className="min-h-11 rounded-full"
        >
          <Plus aria-hidden />
          Course baru
        </Button>
      </div>

      {creating ? (
        <Card className="gap-0 rounded-[20px] py-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardContent className="py-4">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Field className="min-w-0 flex-1">
                <FieldLabel htmlFor="course-baru-nama">
                  Nama course baru
                </FieldLabel>
                <FieldDescription>
                  Nomor baru diambil otomatis setelah 12. Bisa diubah di editor.
                </FieldDescription>
                <Input
                  id="course-baru-nama"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama pola penipuan"
                  required
                />
              </Field>
              <Button type="submit" className="min-h-11 rounded-full">
                Buat draf
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <ul className="flex list-none flex-col gap-3 p-0">
        {rows.map((row) => {
          const status = row.published
            ? "terbit"
            : row.draft
              ? "draf"
              : "kosong";
          return (
            <li key={row.id}>
              <Card className="gap-0 rounded-[20px] py-0 shadow-[var(--appnext-shadow-ambient)]">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="tabular flex flex-wrap items-center gap-2 text-dim">
                      <span>{String(row.no).padStart(2, "0")}</span>
                      <Badge
                        variant={
                          status === "terbit"
                            ? "default"
                            : status === "draf"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {status === "terbit"
                          ? "Terbit"
                          : status === "draf"
                            ? "Draf"
                            : "Kosong"}
                      </Badge>
                    </p>
                    <p className="mt-1 font-medium text-lg text-txt leading-snug">
                      {row.nama}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {row.published ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                      >
                        <Link
                          href={`/admin/${row.no}#pratinjau`}
                          data-pressable
                        >
                          Pratinjau
                        </Link>
                      </Button>
                    ) : null}
                    {row.draft ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11"
                        onClick={() => handleRemoveDraft(row.no)}
                      >
                        <Trash2 aria-hidden />
                        Hapus draf
                      </Button>
                    ) : null}
                    {row.siap ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                      >
                        <Link href={`/admin/${row.no}#terbit`} data-pressable>
                          <Upload aria-hidden />
                          Terbitkan
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" className="min-h-11">
                      <Link href={`/admin/${row.no}`} data-pressable>
                        {row.published
                          ? "Ubah"
                          : row.draft
                            ? "Lanjutkan"
                            : "Buat"}
                        <ArrowRight aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {extraDrafts.length > 0 ? (
        <section aria-labelledby="draf-baru">
          <h2 id="draf-baru" className="text-xl">
            Draf course di luar daftar awal
          </h2>
          <p className="mt-1 text-dim text-sm">
            Nomor ini belum ada di <code>modus.json</code>. Langkah terbitnya
            menyertakan objek yang harus ditempel ke file itu.
          </p>
          <ul className="mt-3 flex list-none flex-col gap-3 p-0">
            {extraDrafts.map((draft) => (
              <li key={draft.no}>
                <Card className="gap-0 rounded-[20px] py-0 shadow-[var(--appnext-shadow-ambient)]">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="tabular flex items-center gap-2">
                        <span className="text-dim">
                          {String(draft.no).padStart(2, "0")}
                        </span>
                        <Badge variant="secondary">Draf baru</Badge>
                      </p>
                      <p className="mt-1 font-medium text-lg text-txt">
                        {draft.meta.nama || "Belum diberi nama"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDraft(draft.no)}
                      >
                        <Trash2 aria-hidden />
                        Hapus draf
                      </Button>
                      {validateDraft(draft) === null ? (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/admin/${draft.no}#terbit`}
                            data-pressable
                          >
                            <Upload aria-hidden />
                            Terbitkan
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm">
                        <Link href={`/admin/${draft.no}`} data-pressable>
                          <FilePen aria-hidden />
                          Lanjutkan
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

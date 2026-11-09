"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnatomyEditor,
  SegmentEditor,
  StringListEditor,
} from "@/components/admin/field-editors";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { ModulBody } from "@/components/belajar/modul-body";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContohJenis, ModuleContent } from "@/data/modul-schema";
import {
  blankDraft,
  type CourseDraft,
  DRAFT_EVENT,
  loadDrafts,
  removeDraft,
  upsertDraft,
  validateDraft,
} from "@/lib/admin/draft-store";
import { exportCourse } from "@/lib/admin/export-course";
import type { LearningModule } from "@/lib/content/schema";

/**
 * Course editor — plans Task 2.2–2.4. Edits a draft on this device, previews it
 * with the real `ModulBody`, then prints the three edits that publish it.
 *
 * Nothing is saved to the product from here: a static Next page cannot write
 * files, and the export is what keeps `/belajar` fast and demo-safe.
 */

/** Four example shapes, in the order the picker shows them. */
const CONTOH_PILIHAN: { value: ContohJenis; label: string }[] = [
  { value: "pesan", label: "Pesan" },
  { value: "tautan", label: "Tautan" },
  { value: "situs", label: "Situs" },
  { value: "panggilan", label: "Panggilan" },
];

function contohPlaceholder(jenis: ContohJenis): string {
  switch (jenis) {
    case "tautan":
      return "Tautan dari sumber tak dikenal";
    case "situs":
      return "https://";
    case "panggilan":
      return "Panggilan masuk · nomor tak dikenal";
    default:
      return "Nomor tak dikenal · baru saja";
  }
}

function CodeBlock({
  label,
  code,
  fileName,
}: {
  label: string;
  code: string;
  fileName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? "course.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="appnext-caption font-medium">{label}</p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="xs" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Tersalin" : "Salin"}
          </Button>
          {fileName ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={download}
            >
              <Download aria-hidden />
              Unduh
            </Button>
          ) : null}
        </div>
      </div>
      <pre className="max-h-80 overflow-auto rounded-[14px] border border-line bg-panel-2 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CourseEditor({
  no,
  module,
}: {
  no: number;
  module: LearningModule | null;
}) {
  const router = useRouter();
  const published = !!module?.content;
  const modus = module?.metadata ?? null;

  const [draft, setDraft] = useState<CourseDraft>(() => blankDraft(no));
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tab, setTab] = useState("isi");

  // The inventory links here with #terbit so "Terbitkan" lands on the export
  // steps instead of the first form field.
  useEffect(() => {
    if (window.location.hash === "#terbit") setTab("terbit");
    else if (window.location.hash === "#pratinjau") setTab("pratinjau");
  }, []);

  useEffect(() => {
    const existing = loadDrafts().courses.find((c) => c.no === no);
    const published = module?.content ?? null;
    const meta = {
      nama: modus?.nama ?? "",
      level: modus?.level ?? 1,
      ciri: modus?.ciri ?? [""],
      laporan: modus?.laporan ?? null,
      laporanNote: modus?.laporanNote ?? null,
      kerugian: modus?.kerugian ?? "",
    };
    setDraft(
      existing ??
        (published
          ? {
              no,
              meta,
              // "Ubah" on a published course must start from what is live,
              // not an empty form that would erase it on the next export.
              content: published,
              updatedAt: new Date().toISOString(),
            }
          : blankDraft(no, meta)),
    );
    const saved = existing ? new Date(existing.updatedAt) : null;
    setSavedAt(
      saved && !Number.isNaN(saved.getTime())
        ? saved.toLocaleTimeString("id-ID")
        : null,
    );
    setHydrated(true);
  }, [no, modus, module]);

  const persist = useCallback((next: CourseDraft) => {
    setDraft(next);
    upsertDraft(next);
    setSavedAt(new Date().toLocaleTimeString("id-ID"));
  }, []);

  // Re-read when another island deletes this draft.
  useEffect(() => {
    function reRead() {
      const still = loadDrafts().courses.find((c) => c.no === no);
      if (!still) setSavedAt(null);
    }
    window.addEventListener(DRAFT_EVENT, reRead);
    return () => window.removeEventListener(DRAFT_EVENT, reRead);
  }, [no]);

  const error = useMemo(
    () => (hydrated ? validateDraft(draft) : null),
    [draft, hydrated],
  );
  const bundle = useMemo(() => exportCourse(draft), [draft]);
  const databaseBundle = JSON.stringify(
    {
      modules: [
        {
          metadata: {
            ...(module?.metadata ?? JSON.parse(bundle.modusEntry)),
            ...draft.meta,
            no: draft.no,
            scenarioId: draft.content.scenarioId,
          },
          content: draft.content,
        },
      ],
      simulations: [],
    },
    null,
    2,
  );

  const content: ModuleContent = draft.content;

  function patchMeta(patch: Partial<CourseDraft["meta"]>) {
    persist({ ...draft, meta: { ...draft.meta, ...patch } });
  }

  function patchContent(patch: Partial<ModuleContent>) {
    persist({ ...draft, content: { ...draft.content, ...patch } });
  }

  function handleDelete() {
    removeDraft(no);
    router.push("/admin");
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        data-pressable
        className="inline-flex w-fit items-center gap-1 text-dim text-sm hover:text-txt"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Semua course
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="appnext-caption flex flex-wrap items-center gap-2">
            <span className="tabular">
              Course {String(no).padStart(2, "0")}
            </span>
            {published ? (
              <Badge>Terbit</Badge>
            ) : (
              <Badge variant="secondary">Draf</Badge>
            )}
            {published ? null : (
              <span className="flex items-center gap-1">
                <Label htmlFor="editor-no" className="text-dim text-xs">
                  Nomor
                </Label>
                <Input
                  id="editor-no"
                  type="number"
                  min={1}
                  max={99}
                  value={no}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isNaN(next) || next < 1 || next > 99) return;
                    if (next === no) return;
                    // Renumbering is a move: write the new draft, drop the old.
                    const moved: CourseDraft = {
                      ...draft,
                      no: next,
                      content: { ...draft.content, no: next },
                    };
                    upsertDraft(moved);
                    removeDraft(no);
                    setDraft(moved);
                    setSavedAt(new Date().toLocaleTimeString("id-ID"));
                    router.replace(`/admin/${next}`);
                  }}
                  className="h-7 w-16 tabular"
                />
              </span>
            )}
          </p>
          <h1 className="mt-2">
            {draft.meta.nama || "Course baru tanpa nama"}
          </h1>
          <p className="mt-1 text-dim text-sm">
            Tampil di katalog murid setelah diterbitkan — langkahnya ada di tab{" "}
            <strong className="font-medium text-txt">Terbitkan</strong>.
            Pratinjau ada di tab{" "}
            <strong className="font-medium text-txt">Pratinjau</strong>.
          </p>
          <p className="appnext-caption mt-2">
            {savedAt
              ? `Draf tersimpan di perangkat ini · ${savedAt}`
              : "Belum ada draf tersimpan"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setTab("terbit")}
            className="rounded-full"
          >
            <Upload aria-hidden />
            Terbitkan
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 aria-hidden />
            Hapus draf
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="isi">
            <Save aria-hidden />
            Isi
          </TabsTrigger>
          <TabsTrigger value="pratinjau">
            <Eye aria-hidden />
            Pratinjau
          </TabsTrigger>
          <TabsTrigger value="terbit">
            <Upload aria-hidden />
            Terbitkan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="isi" className="mt-5">
          <div className="flex flex-col gap-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Isi belum lengkap</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}
            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">
                  Judul & metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 py-0 pb-5">
                <Field>
                  <FieldLabel htmlFor="meta-nama">Nama course</FieldLabel>
                  <FieldDescription>
                    Muncul di katalog dan di kartu hasil companion.
                  </FieldDescription>
                  <Input
                    id="meta-nama"
                    value={draft.meta.nama}
                    onChange={(e) => patchMeta({ nama: e.target.value })}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="meta-level">Level</FieldLabel>
                    <Input
                      id="meta-level"
                      type="number"
                      min={1}
                      max={5}
                      value={draft.meta.level}
                      onChange={(e) =>
                        patchMeta({ level: Number(e.target.value) || 1 })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="meta-kerugian">
                      Estimasi kerugian
                    </FieldLabel>
                    <Input
                      id="meta-kerugian"
                      value={draft.meta.kerugian}
                      onChange={(e) => patchMeta({ kerugian: e.target.value })}
                      placeholder="±Rp134 M"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="meta-laporan">
                    Jumlah laporan IASC
                  </FieldLabel>
                  <FieldDescription>
                    Kosongkan kalau angkanya bukan jumlah laporan; isi catatan
                    di bawah.
                  </FieldDescription>
                  <Input
                    id="meta-laporan"
                    inputMode="numeric"
                    value={
                      draft.meta.laporan === null ? "" : draft.meta.laporan
                    }
                    onChange={(e) =>
                      patchMeta({
                        laporan:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="meta-catatan">
                    Catatan laporan (kalau bukan angka)
                  </FieldLabel>
                  <Input
                    id="meta-catatan"
                    value={draft.meta.laporanNote ?? ""}
                    onChange={(e) =>
                      patchMeta({
                        laporanNote:
                          e.target.value === "" ? null : e.target.value,
                      })
                    }
                    placeholder="Peringatan OJK"
                  />
                </Field>

                <StringListEditor
                  id="meta-ciri"
                  label="Ciri singkat"
                  description="Satu baris di kartu katalog. Maksimal empat."
                  items={draft.meta.ciri}
                  onChange={(ciri) => patchMeta({ ciri })}
                  addLabel="Tambah ciri"
                  max={4}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">
                  Cara kerja penipuan
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-5">
                <AnatomyEditor
                  items={draft.content.anatomi}
                  onChange={(anatomi) => patchContent({ anatomi })}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">
                  Contoh penipuan
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 py-0 pb-5">
                <Field aria-label="Bentuk contoh">
                  <FieldTitle>Bentuk contoh</FieldTitle>
                  <FieldDescription>
                    Penipuan tidak selalu berupa pesan. Pilih bentuk yang paling
                    mirip kejadian nyata — bingkainya ikut berubah.
                  </FieldDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CONTOH_PILIHAN.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={
                          (draft.content.contohJenis ?? "pesan") === value
                            ? "default"
                            : "outline"
                        }
                        aria-pressed={
                          (draft.content.contohJenis ?? "pesan") === value
                        }
                        onClick={() => patchContent({ contohJenis: value })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="contoh-sumber">Baris sumber</FieldLabel>
                  <FieldDescription>
                    {draft.content.contohJenis === "situs"
                      ? "Wajib: alamat yang tampil di address bar."
                      : "Pengirim, sumber tautan, atau nomor pemanggil."}
                  </FieldDescription>
                  <Input
                    id="contoh-sumber"
                    value={draft.content.contohSumber ?? ""}
                    onChange={(e) =>
                      patchContent({ contohSumber: e.target.value })
                    }
                    placeholder={contohPlaceholder(
                      draft.content.contohJenis ?? "pesan",
                    )}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="contoh-judul">Judul contoh</FieldLabel>
                  <Input
                    id="contoh-judul"
                    value={draft.content.contohJudul}
                    onChange={(e) =>
                      patchContent({ contohJudul: e.target.value })
                    }
                    placeholder="Contoh (dianonimkan) — bagian merah yang berbahaya"
                  />
                </Field>
                <SegmentEditor
                  items={draft.content.contohIsi}
                  onChange={(contohIsi) => patchContent({ contohIsi })}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">
                  Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-5">
                <StringListEditor
                  id="checklist"
                  label="Tanda bahaya"
                  description="Satu saja muncul, pengguna harus berhenti."
                  items={draft.content.checklist}
                  onChange={(checklist) => patchContent({ checklist })}
                  addLabel="Tambah tanda"
                  max={8}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">Kuis</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-5">
                <QuizEditor
                  items={draft.content.kuis}
                  onChange={(kuis) => patchContent({ kuis })}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">
                  Kalau sudah terjadi
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-5">
                <StringListEditor
                  id="lapor"
                  label="Langkah pelaporan"
                  description="Urutannya penting. Jangan dibalik."
                  items={draft.content.lapor}
                  onChange={(lapor) => patchContent({ lapor })}
                  addLabel="Tambah langkah"
                  max={6}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] py-0 shadow-[var(--appnext-shadow-ambient)]">
              <CardHeader className="py-5">
                <CardTitle className="font-normal text-2xl">Simulasi</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-5">
                <Field>
                  <FieldLabel htmlFor="scenario-id">Id skenario</FieldLabel>
                  <FieldDescription>
                    Kosongkan kalau course ini belum punya simulasi. Itu jujur,
                    bukan stub.
                  </FieldDescription>
                  <Input
                    id="scenario-id"
                    value={draft.content.scenarioId ?? ""}
                    onChange={(e) =>
                      patchContent({
                        scenarioId:
                          e.target.value === "" ? null : e.target.value,
                      })
                    }
                    placeholder="L1-kurir-apk"
                  />
                </Field>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pratinjau" className="mt-5">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Pratinjau belum bisa dirender</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {error}
              </AlertDescription>
            </Alert>
          ) : (
            <ModulBody modul={content} />
          )}
        </TabsContent>

        <TabsContent value="terbit" className="mt-5">
          <div className="flex flex-col gap-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Belum bisa diterbitkan</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {error}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTab("isi")}
                    >
                      <ArrowLeft aria-hidden />
                      Perbaiki isi
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Langkah terbit</AlertTitle>
                <AlertDescription>
                  Unduh JSON, lalu impor ke database deployment dengan perintah
                  di bawah. Draf di perangkat ini belum mengubah materi publik.
                </AlertDescription>
              </Alert>
            )}

            {!error && (
              <Card className="gap-0 rounded-card py-0">
                <CardContent className="flex flex-col gap-5 py-5">
                  <CodeBlock
                    label="Konten untuk database"
                    code={databaseBundle}
                    fileName={`modul-${no}.json`}
                  />
                  <CodeBlock
                    label="Impor di server deployment"
                    code={`npm run db:seed -- modul-${no}.json --replace`}
                  />
                  <p className="text-sm text-dim">
                    Impor memperbarui modul ini tanpa menghapus akun atau
                    progres. Skenario yang dirujuk harus sudah tersedia.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

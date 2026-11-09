"use client";
import { Globe2, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publishPost, publishReply } from "@/lib/community/actions";
import {
  CATEGORIES,
  type Category,
  type CommunityPost,
  type CommunityReply,
} from "@/lib/community/schema";

/** Port of the clone's Input grid and public composer, using Lumina actions. */
export function TimelineComposer({
  canWrite,
  viewerName,
}: {
  canWrite: boolean;
  viewerName?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("modus-baru");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b-2 border-line px-4 py-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || !canWrite) return;
        setPending(true);
        setError("");
        try {
          const text = body.trim();
          const firstLine = text.split("\n")[0];
          const result = await publishPost({
            title: (firstLine.length >= 10 ? firstLine : text).slice(0, 140),
            body: text,
            category,
            sourceUrl: "",
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBody("");
          router.refresh();
        } catch {
          setError("Topik belum tersimpan. Coba lagi.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Avatar className="size-10">
        <AvatarFallback className="bg-panel-2 text-txt">
          {viewerName?.trim().charAt(0).toUpperCase() || (
            <Globe2 aria-hidden className="size-5" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        {canWrite ? (
          <>
            <label htmlFor="timeline-body" className="sr-only">
              Apa yang sedang terjadi?
            </label>
            <Textarea
              id="timeline-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Apa yang sedang terjadi?"
              required
              minLength={30}
              maxLength={6000}
              rows={2}
              disabled={pending}
              className="min-h-20 resize-y rounded-none border-0 bg-transparent px-0 py-2 text-xl shadow-none ring-0 focus-visible:ring-0 md:text-xl"
            />
            <p className="flex items-center gap-1.5 border-b border-line pb-3 text-xs font-medium text-brand-ink">
              <Globe2 aria-hidden className="size-4" />
              Semua orang dapat membaca
            </p>
            <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <label className="min-w-0 text-xs text-brand-ink">
                <span className="sr-only">Jenis diskusi</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  disabled={pending}
                  className="min-h-11 max-w-full rounded-full bg-transparent pr-2 font-medium"
                >
                  {Object.entries(CATEGORIES).map(([key, c]) => (
                    <option key={key} value={key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="submit"
                disabled={pending || body.trim().length < 30}
                className="min-h-11 rounded-full px-5 font-bold"
              >
                {pending ? "Mengirim…" : "Posting"}
              </Button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-dim">
              Minimal 30 karakter. Samarkan data pribadi; kiriman dan nama
              tampil publik.
            </p>
          </>
        ) : (
          <div className="py-2">
            <p className="text-xl text-dim">Apa yang sedang terjadi?</p>
            <p className="mt-2 text-sm text-dim">
              Masuk untuk berbagi cerita. Semua orang bisa membaca.
            </p>
            <Button
              asChild
              className="mt-3 min-h-11 rounded-full px-4 font-bold"
            >
              <Link href="/masuk">Masuk untuk berdiskusi</Link>
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export function PostEditor({
  post,
  onDone,
}: {
  post?: CommunityPost;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [category, setCategory] = useState<Category>(
    post?.category ?? "modus-baru",
  );
  const [sourceUrl, setSourceUrl] = useState(post?.sourceUrl ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="flex min-w-0 flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        setPending(true);
        setError("");
        try {
          const r = await publishPost({
            id: post?.id,
            title,
            body,
            category,
            sourceUrl,
          });
          if (r.ok) {
            onDone?.();
            router.push(`/komunitas/${r.id}`);
            router.refresh();
          } else setError(r.error);
        } catch {
          setError("Topik belum tersimpan. Coba lagi.");
        } finally {
          setPending(false);
        }
      }}
    >
      <FieldSet>
        <FieldLegend variant="label">Jenis diskusi</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <Button
              key={key}
              type="button"
              variant={category === key ? "default" : "outline"}
              aria-pressed={category === key}
              className="min-h-11 rounded-full"
              onClick={() => setCategory(key as Category)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <FieldDescription>{CATEGORIES[category].description}</FieldDescription>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor="post-title">Judul diskusi</FieldLabel>
        <Input
          id="post-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={10}
          maxLength={140}
          placeholder="Contoh: Ada pesan kurir meminta instal file APK"
          className="min-h-11"
        />
        <FieldDescription>
          10–140 karakter. Sebutkan polanya, hindari data pribadi.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="post-body">Ceritakan konteksnya</FieldLabel>
        <Textarea
          id="post-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={30}
          maxLength={6000}
          rows={9}
          placeholder="Apa yang terjadi? Bagaimana cara pelaku menghubungi? Apa yang ingin kamu tanyakan atau bagikan?"
          className="min-h-48 resize-y"
        />
        <FieldDescription>
          Samarkan nama, nomor telepon, rekening, dan data korban. Jangan tulis
          OTP atau password.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="post-source">Tautan sumber (opsional)</FieldLabel>
        <Input
          id="post-source"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          maxLength={1000}
          placeholder="https://sumber-resmi..."
          className="min-h-11"
        />
        <FieldDescription>
          Tambahkan berita atau informasi resmi bila tersedia.
        </FieldDescription>
      </Field>
      <Alert>
        <AlertDescription>
          Topik dan nama tampilanmu akan terlihat publik. Email akun tidak
          ditampilkan. Teks pemeriksaan Companion tidak disalin otomatis.
        </AlertDescription>
      </Alert>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-full sm:w-fit"
      >
        {pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <Send aria-hidden />
        )}
        {pending
          ? "Menyimpan…"
          : post
            ? "Simpan perubahan"
            : "Terbitkan diskusi"}
      </Button>
    </form>
  );
}

export function ReplyEditor({
  postId,
  reply,
  onDone,
}: {
  postId: string;
  reply?: CommunityReply;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(reply?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending) return;
        setPending(true);
        setError("");
        try {
          const result = await publishReply({ id: reply?.id, postId, body });
          if (result.ok) {
            if (!reply) setBody("");
            onDone?.();
            router.refresh();
          } else setError(result.error);
        } catch {
          setError("Balasan belum tersimpan. Coba lagi.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Field>
        <FieldLabel htmlFor={reply ? `reply-${reply.id}` : "new-reply"}>
          {reply ? "Ubah balasan" : "Tulis balasan"}
        </FieldLabel>
        <Textarea
          id={reply ? `reply-${reply.id}` : "new-reply"}
          required
          minLength={5}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Bagikan sudut pandang, langkah yang kamu ketahui, atau sumber yang dapat diperiksa."
        />
        <FieldDescription>
          Balasan bersifat publik. Hormati korban dan samarkan data pribadi.
        </FieldDescription>
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        disabled={pending}
        className="min-h-11 w-fit rounded-full"
        type="submit"
      >
        {pending ? "Menyimpan…" : reply ? "Simpan balasan" : "Kirim balasan"}
      </Button>
    </form>
  );
}

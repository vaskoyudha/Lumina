"use client";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

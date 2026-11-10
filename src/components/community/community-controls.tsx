"use client";
import {
  Bookmark,
  Flag,
  Heart,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PostEditor,
  ReplyEditor,
} from "@/components/community/community-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteContent,
  flagContent,
  markHelpful,
  markSaved,
  moderateContent,
  verifyPost,
} from "@/lib/community/actions";
import type {
  CommunityPost,
  CommunityReply,
  MutationResult,
} from "@/lib/community/schema";

function useMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return {
    pending,
    message,
    run: async (task: () => Promise<MutationResult>, done?: () => void) => {
      if (pending) return;
      setPending(true);
      setMessage("");
      try {
        const r = await task();
        if (r.ok) {
          done?.();
          router.refresh();
        } else setMessage(r.error);
      } catch {
        setMessage("Perubahan belum tersimpan. Coba lagi.");
      } finally {
        setPending(false);
      }
    },
  };
}
export function HelpfulButton({
  post,
  canWrite,
  compact = false,
}: {
  post: CommunityPost;
  canWrite: boolean;
  compact?: boolean;
}) {
  const m = useMutation();
  const label = `${post.hasHelped ? "Sudah membantu" : "Membantu"} · ${post.helpful}`;
  const className = compact
    ? "min-h-11 rounded-full px-3 text-xs text-dim aria-pressed:bg-brand-soft aria-pressed:text-brand-ink"
    : "min-h-11 rounded-full";
  return (
    <div className="min-w-0">
      {canWrite ? (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={className}
          aria-label={label}
          aria-pressed={post.hasHelped}
          disabled={m.pending}
          onClick={() =>
            void m.run(() =>
              markHelpful({ id: post.id, value: !post.hasHelped }),
            )
          }
        >
          <Heart aria-hidden fill={post.hasHelped ? "currentColor" : "none"} />
          {label}
        </Button>
      ) : (
        <Button
          asChild
          variant={compact ? "ghost" : "outline"}
          className={className}
        >
          <Link
            href="/masuk"
            aria-label={`Masuk untuk memberi reaksi Membantu · ${post.helpful}`}
          >
            <Heart aria-hidden />
            Membantu · {post.helpful}
          </Link>
        </Button>
      )}
      {m.message && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {m.message}
        </p>
      )}
    </div>
  );
}
export function SaveButton({
  post,
  canWrite,
  compact = false,
}: {
  post: CommunityPost;
  canWrite: boolean;
  compact?: boolean;
}) {
  const m = useMutation();
  const label = post.hasSaved ? "Tersimpan" : "Simpan";
  const className = compact
    ? "min-h-11 rounded-full px-3 text-xs text-dim aria-pressed:bg-brand-soft aria-pressed:text-brand-ink"
    : "min-h-11 rounded-full";
  return (
    <div className="min-w-0">
      {canWrite ? (
        <Button
          variant={compact ? "ghost" : "outline"}
          className={className}
          aria-label={
            post.hasSaved
              ? "Hapus dari diskusi tersimpan"
              : "Simpan diskusi ini"
          }
          aria-pressed={post.hasSaved}
          disabled={m.pending}
          onClick={() =>
            void m.run(() => markSaved({ id: post.id, value: !post.hasSaved }))
          }
        >
          <Bookmark
            aria-hidden
            fill={post.hasSaved ? "currentColor" : "none"}
          />
          {label}
        </Button>
      ) : (
        <Button
          asChild
          variant={compact ? "ghost" : "outline"}
          className={className}
        >
          <Link href="/masuk" aria-label="Masuk untuk menyimpan diskusi">
            <Bookmark aria-hidden />
            Simpan
          </Link>
        </Button>
      )}
      {m.message && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {m.message}
        </p>
      )}
    </div>
  );
}
export function ContentControls({
  post,
  reply,
  canWrite,
  compact = false,
}: {
  post: CommunityPost;
  reply?: CommunityReply;
  canWrite: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const m = useMutation();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reported, setReported] = useState(false);
  const item = reply ?? post;
  const target = {
    id: item.id,
    kind: reply ? ("reply" as const) : ("post" as const),
  };
  return (
    <div className="flex flex-col gap-2">
      {compact && canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full text-dim"
              aria-label={`Opsi kiriman oleh ${item.author}`}
              disabled={m.pending}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {item.isOwner ? (
                <>
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    <Pencil aria-hidden />
                    Ubah
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDeleting(true)}>
                    <Trash2 aria-hidden />
                    Hapus
                  </DropdownMenuItem>
                </>
              ) : (
                [
                  ["data-pribadi", "Laporkan data pribadi"],
                  ["spam", "Laporkan spam atau promosi"],
                  ["berbahaya", "Laporkan konten berbahaya"],
                ].map(([reason, label]) => (
                  <DropdownMenuItem
                    key={reason}
                    disabled={reported}
                    onSelect={() =>
                      void m.run(
                        () => flagContent({ ...target, reason }),
                        () => setReported(true),
                      )
                    }
                  >
                    <Flag aria-hidden />
                    {label}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {item.isOwner && (
          <>
            <Dialog open={editing} onOpenChange={setEditing}>
              {!compact && (
                <DialogTrigger asChild>
                  <Button variant="ghost" className="min-h-11">
                    <Pencil aria-hidden />
                    Ubah
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {reply ? "Ubah balasan" : "Ubah diskusi"}
                  </DialogTitle>
                  <DialogDescription>
                    Perubahanmu akan terlihat publik.
                  </DialogDescription>
                </DialogHeader>
                {reply ? (
                  <ReplyEditor
                    postId={post.id}
                    reply={reply}
                    onDone={() => setEditing(false)}
                  />
                ) : (
                  <PostEditor post={post} onDone={() => setEditing(false)} />
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={deleting} onOpenChange={setDeleting}>
              {!compact && (
                <DialogTrigger asChild>
                  <Button variant="ghost" className="min-h-11">
                    <Trash2 aria-hidden />
                    Hapus
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Hapus {reply ? "balasan" : "diskusi"} ini?
                  </DialogTitle>
                  <DialogDescription>
                    Kontenmu akan dihapus dari tampilan publik.
                    {!reply
                      ? " Balasan pada diskusi ini juga tidak akan ditampilkan."
                      : ""}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="min-h-11">
                      Batal
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    disabled={m.pending}
                    className="min-h-11"
                    onClick={() =>
                      void m.run(
                        () => deleteContent(target),
                        () => {
                          setDeleting(false);
                          if (!reply) router.push("/komunitas");
                        },
                      )
                    }
                  >
                    Ya, hapus
                  </Button>
                </div>
                {m.message && (
                  <p role="alert" className="text-danger">
                    {m.message}
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
        {!compact && canWrite && !item.isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={m.pending || reported}
              >
                <Flag aria-hidden />
                {reported ? "Sudah dilaporkan" : "Laporkan"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                ["data-pribadi", "Memuat data pribadi"],
                ["spam", "Spam atau promosi"],
                ["berbahaya", "Konten berbahaya"],
              ].map(([reason, label]) => (
                <DropdownMenuItem
                  key={reason}
                  onSelect={() =>
                    void m.run(
                      () => flagContent({ ...target, reason }),
                      () => setReported(true),
                    )
                  }
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {reported && (
        <output className="text-xs text-dim">
          Laporan tersimpan untuk ditinjau pengelola komunitas.
        </output>
      )}
      {m.message && !deleting && (
        <p role="alert" className="text-sm text-danger">
          {m.message}
        </p>
      )}
    </div>
  );
}
export function ModerationControls({
  id,
  kind,
}: {
  id: string;
  kind: "post" | "reply";
}) {
  const m = useMutation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          disabled={m.pending}
          onClick={() =>
            void m.run(() => moderateContent({ id, kind, hide: true }))
          }
        >
          Sembunyikan konten
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={m.pending}
          onClick={() =>
            void m.run(() => moderateContent({ id, kind, hide: false }))
          }
        >
          Tetap tampilkan
        </Button>
      </div>
      {m.message && (
        <Alert variant="destructive">
          <AlertDescription>{m.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
export function VerificationControls({
  id,
  verified,
}: {
  id: string;
  verified: boolean;
}) {
  const m = useMutation();
  return (
    <div className="flex flex-col gap-2">
      {verified ? (
        <Button
          variant="outline"
          className="min-h-11 w-fit"
          disabled={m.pending}
          onClick={() => void m.run(() => verifyPost({ id, value: false }))}
        >
          <ShieldOff aria-hidden />
          Batalkan verifikasi
        </Button>
      ) : (
        <Button
          className="min-h-11 w-fit"
          disabled={m.pending}
          onClick={() => void m.run(() => verifyPost({ id, value: true }))}
        >
          <ShieldCheck aria-hidden />
          Verifikasi kiriman
        </Button>
      )}
      {m.message && (
        <Alert variant="destructive">
          <AlertDescription>{m.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

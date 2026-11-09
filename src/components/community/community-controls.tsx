"use client";
import { Flag, Pencil, ThumbsUp, Trash2 } from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteContent,
  flagContent,
  markHelpful,
  moderateContent,
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
}: {
  post: CommunityPost;
  canWrite: boolean;
}) {
  const m = useMutation();
  return (
    <div>
      {canWrite ? (
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          aria-pressed={post.hasHelped}
          disabled={m.pending}
          onClick={() =>
            void m.run(() =>
              markHelpful({ id: post.id, value: !post.hasHelped }),
            )
          }
        >
          <ThumbsUp aria-hidden />
          {post.hasHelped ? "Sudah membantu" : "Membantu"} · {post.helpful}
        </Button>
      ) : (
        <Button asChild variant="outline" className="min-h-11 rounded-full">
          <Link href="/masuk">
            <ThumbsUp aria-hidden />
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
export function ContentControls({
  post,
  reply,
  canWrite,
}: {
  post: CommunityPost;
  reply?: CommunityReply;
  canWrite: boolean;
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
      <div className="flex flex-wrap items-center gap-1">
        {item.isOwner && (
          <>
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="min-h-11">
                  <Pencil aria-hidden />
                  Ubah
                </Button>
              </DialogTrigger>
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
              <DialogTrigger asChild>
                <Button variant="ghost" className="min-h-11">
                  <Trash2 aria-hidden />
                  Hapus
                </Button>
              </DialogTrigger>
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
        {canWrite && !item.isOwner && (
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

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  ShieldCheck,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import {
  ContentControls,
  HelpfulButton,
} from "@/components/community/community-controls";
import { ReplyEditor } from "@/components/community/community-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIES,
  type CommunityPost,
  type CommunityQuery,
  type CommunityReply,
  communityDate,
  PAGE_SIZE,
  REPLY_PAGE_SIZE,
} from "@/lib/community/schema";

export function CommunityRules({ moderator = false }: { moderator?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-card">
        <CardHeader>
          <ShieldCheck aria-hidden className="mb-2 size-6 text-brand" />
          <CardTitle>Ruang saling menjaga</CardTitle>
          <CardDescription>
            Satu cerita bisa membuat orang lain lebih waspada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-dim">
            <li>
              Bahas polanya. Samarkan nama, nomor, rekening, dan data korban.
            </li>
            <li>
              Bedakan pengalaman pribadi dengan informasi yang punya sumber.
            </li>
            <li>
              Jangan menyalahkan korban, menawarkan jasa pemulihan dana, atau
              meminta kode rahasia.
            </li>
            <li>
              Diskusi anggota belum terverifikasi. Banyak reaksi bukan bukti
              kebenaran.
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card className="rounded-card bg-brand-soft">
        <CardHeader>
          <CardTitle>Periksa sebelum menyebarkan</CardTitle>
          <CardDescription className="text-brand-ink">
            Gunakan Companion untuk memahami tanda bahaya pada pesanmu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            variant="outline"
            className="min-h-11 w-full rounded-full"
          >
            <Link href="/companion">
              Buka Companion
              <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
      {moderator && (
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/komunitas/moderasi">Tinjau laporan komunitas</Link>
        </Button>
      )}
    </div>
  );
}
export function CommunityUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Alert>
        <AlertTitle>Komunitas belum bisa dimuat</AlertTitle>
        <AlertDescription>
          Koneksi layanan sedang bermasalah. Muat ulang halaman untuk mencoba
          lagi. Diskusi yang sudah tersimpan tetap berada di akun penulisnya.
        </AlertDescription>
      </Alert>
    </div>
  );
}
function queryHref(query: CommunityQuery, change: Partial<CommunityQuery>) {
  const next = { ...query, ...change };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.category) p.set("category", next.category);
  if (next.sort !== "terbaru") p.set("sort", next.sort);
  if (next.page > 1) p.set("page", String(next.page));
  return `/komunitas${p.size ? `?${p}` : ""}`;
}
function Identity({
  name,
  date,
  updated,
}: {
  name: string;
  date: string;
  updated?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-brand-soft text-brand-ink">
          {name.trim().charAt(0).toUpperCase() || "A"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-txt">{name}</p>
        <p className="text-xs text-dim">
          <time dateTime={date}>{communityDate(date)}</time>
          {updated && updated !== date ? " · disunting" : ""}
        </p>
      </div>
    </div>
  );
}
export function CommunityFeed({
  posts,
  total,
  query,
  canWrite,
}: {
  posts: CommunityPost[];
  total: number;
  query: CommunityQuery;
  canWrite: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5 pb-6">
      <header className="flex flex-col gap-5 rounded-card bg-brand-soft p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-panel text-brand-ink">
            <MessagesSquare aria-hidden className="mr-1 size-3.5" />
            Komunitas Lumina
          </Badge>
          <span className="text-xs text-brand-ink">
            Kenali polanya, saling ingatkan.
          </span>
        </div>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h1 className="font-medium text-3xl tracking-tight sm:text-4xl">
              Lebih waspada, bersama.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-dim">
              Temukan modus baru, tanyakan hal yang mengganjal, dan bagikan
              pengalaman yang bisa melindungi orang lain.
            </p>
          </div>
          <Button asChild className="min-h-11 shrink-0 rounded-full">
            <Link href={canWrite ? "/komunitas/baru" : "/masuk"}>
              <Plus aria-hidden />
              {canWrite ? "Mulai diskusi" : "Masuk untuk berdiskusi"}
            </Link>
          </Button>
        </div>
      </header>
      <form
        method="get"
        action="/komunitas"
        className="flex min-w-0 flex-wrap items-end gap-2"
      >
        <div className="min-w-0 flex-1">
          <Label htmlFor="community-search" className="sr-only">
            Cari diskusi
          </Label>
          <Input
            id="community-search"
            name="q"
            defaultValue={query.q}
            placeholder="Cari modus, pengalaman, atau kata kunci…"
            maxLength={120}
            className="h-11 rounded-full bg-panel"
          />
        </div>
        {query.category && (
          <input type="hidden" name="category" value={query.category} />
        )}
        <input type="hidden" name="sort" value={query.sort} />
        <Button
          variant="outline"
          type="submit"
          className="min-h-11 rounded-full"
        >
          <Search aria-hidden />
          Cari
        </Button>
      </form>
      <nav aria-label="Kategori diskusi" className="flex flex-wrap gap-2">
        {[
          [undefined, "Semua diskusi"],
          ...Object.entries(CATEGORIES).map(([key, c]) => [key, c.label]),
        ].map(([key, label]) => (
          <Button
            key={key ?? "all"}
            asChild
            variant={query.category === key ? "default" : "outline"}
            className="min-h-11 rounded-full"
          >
            <Link
              href={queryHref(query, {
                category: key as CommunityQuery["category"],
                page: 1,
              })}
              aria-current={query.category === key ? "page" : undefined}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="flex flex-col justify-between gap-3 border-line border-b pb-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-medium">
          {query.q ? `Hasil untuk “${query.q}”` : "Percakapan komunitas"}
          <span className="ml-2 text-sm font-normal text-dim">
            {total} diskusi
          </span>
        </h2>
        <nav aria-label="Urutan diskusi" className="flex flex-wrap gap-1">
          {[
            ["terbaru", "Terbaru"],
            ["ramai", "Ramai"],
            ["belum-dibalas", "Belum dibalas"],
          ].map(([sort, label]) => (
            <Button
              asChild
              variant={query.sort === sort ? "secondary" : "ghost"}
              size="sm"
              className="min-h-11 rounded-full"
              key={sort}
            >
              <Link
                href={queryHref(query, {
                  sort: sort as CommunityQuery["sort"],
                  page: 1,
                })}
                aria-current={query.sort === sort ? "page" : undefined}
              >
                {label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
      {posts.length ? (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Card key={post.id} className="gap-0 rounded-card py-0">
              <CardContent className="min-w-0 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Identity name={post.author} date={post.createdAt} />
                  <Badge
                    variant="secondary"
                    className="bg-brand-soft text-brand-ink"
                  >
                    {CATEGORIES[post.category].label}
                  </Badge>
                </div>
                <h3 className="mt-4 break-words text-lg font-medium [overflow-wrap:anywhere]">
                  <Link
                    href={`/komunitas/${post.id}`}
                    className="hover:text-brand-ink hover:underline underline-offset-4"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 break-words text-sm text-dim [overflow-wrap:anywhere]">
                  {post.body}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-dim">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle aria-hidden className="size-3.5" />
                    {post.replies} balasan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ThumbsUp aria-hidden className="size-3.5" />
                    {post.helpful} membantu
                  </span>
                  <span>Dibagikan anggota · belum terverifikasi</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty className="rounded-card bg-panel py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {query.q || query.category || query.sort === "belum-dibalas"
                ? "Belum ada diskusi yang cocok"
                : "Percakapan pertama bisa dimulai darimu"}
            </EmptyTitle>
            <EmptyDescription>
              {query.q || query.category
                ? "Coba kata kunci lain atau tampilkan semua diskusi."
                : "Punya cerita atau pola mencurigakan? Bagikan konteksnya agar anggota lain bisa ikut memahami."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="min-h-11 rounded-full">
              <Link
                href={
                  query.q || query.category
                    ? "/komunitas"
                    : canWrite
                      ? "/komunitas/baru"
                      : "/masuk"
                }
              >
                {query.q || query.category
                  ? "Lihat semua diskusi"
                  : canWrite
                    ? "Mulai diskusi"
                    : "Masuk untuk berdiskusi"}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      <Pagination
        page={query.page}
        total={total}
        size={PAGE_SIZE}
        href={(page) => queryHref(query, { page })}
      />
    </div>
  );
}
export function Pagination({
  page,
  total,
  size,
  href,
}: {
  page: number;
  total: number;
  size: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1 && page === 1) return null;
  return (
    <nav
      aria-label="Halaman diskusi"
      className="flex flex-wrap items-center justify-between gap-3 py-2"
    >
      {page > 1 ? (
        <Button asChild variant="outline" className="min-h-11">
          <Link href={href(page - 1)}>
            <ArrowLeft aria-hidden />
            Sebelumnya
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-xs text-dim">
        Halaman {page} dari {pages}
      </span>
      {page < pages && (
        <Button asChild variant="outline" className="min-h-11">
          <Link href={href(page + 1)}>
            Berikutnya
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </nav>
  );
}
export function CommunityThread({
  post,
  replies,
  canWrite,
  page,
}: {
  post: CommunityPost;
  replies: CommunityReply[];
  canWrite: boolean;
  page: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-5 pb-8">
      <Button asChild variant="ghost" className="min-h-11 w-fit px-0">
        <Link href="/komunitas">
          <ArrowLeft aria-hidden />
          Semua diskusi
        </Link>
      </Button>
      <Card className="rounded-card">
        <CardHeader>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-brand-soft text-brand-ink">
              {CATEGORIES[post.category].label}
            </Badge>
            <span className="text-xs text-dim">
              Dibagikan anggota · belum terverifikasi
            </span>
          </div>
          <h1 className="break-words text-2xl font-medium sm:text-3xl [overflow-wrap:anywhere]">
            {post.title}
          </h1>
          <div className="pt-4">
            <Identity
              name={post.author}
              date={post.createdAt}
              updated={post.updatedAt}
            />
          </div>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-5">
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed [overflow-wrap:anywhere]">
            {post.body}
          </p>
          {post.sourceUrl && (
            <div className="min-w-0 rounded-xl bg-panel-2 p-4">
              <p className="text-xs font-medium text-dim">
                Sumber yang dibagikan penulis
              </p>
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="nofollow noopener noreferrer ugc"
                className="mt-1 block break-all text-sm text-brand-ink underline underline-offset-4"
              >
                {post.sourceUrl}
              </a>
              <p className="mt-2 text-xs text-dim">
                Periksa domain sebelum membuka. Tautan anggota tidak
                diverifikasi Lumina.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <HelpfulButton post={post} canWrite={canWrite} />
            <ContentControls post={post} canWrite={canWrite} />
          </div>
        </CardContent>
      </Card>
      <section aria-labelledby="replies-title" className="flex flex-col gap-3">
        <h2 id="replies-title" className="text-lg font-medium">
          Diskusi{" "}
          <span className="text-sm font-normal text-dim">
            · {post.replies} balasan
          </span>
        </h2>
        {replies.length ? (
          replies.map((reply) => (
            <Card key={reply.id} className="gap-0 rounded-card py-0">
              <CardContent className="flex flex-col gap-4 p-5">
                <Identity
                  name={reply.author}
                  date={reply.createdAt}
                  updated={reply.updatedAt}
                />
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {reply.body}
                </p>
                <ContentControls
                  post={post}
                  reply={reply}
                  canWrite={canWrite}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-xl bg-panel-2 p-5 text-sm text-dim">
            Belum ada balasan. Bagikan sudut pandangmu dengan tetap menghormati
            penulis.
          </p>
        )}
        <Pagination
          page={page}
          total={post.replies}
          size={REPLY_PAGE_SIZE}
          href={(p) => `/komunitas/${post.id}?page=${p}`}
        />
      </section>
      <Card className="rounded-card">
        <CardHeader>
          <CardTitle>Ikut berdiskusi</CardTitle>
        </CardHeader>
        <CardContent>
          {canWrite ? (
            <ReplyEditor postId={post.id} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-dim">
                Masuk untuk membalas menggunakan akun Lumina.
              </p>
              <Button asChild className="min-h-11 w-fit rounded-full">
                <Link href="/masuk">Masuk untuk membalas</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  ContentControls,
  HelpfulButton,
} from "@/components/community/community-controls";
import {
  ReplyEditor,
  TimelineComposer,
} from "@/components/community/community-editor";
import { ExplorePanel } from "@/components/community/community-explore";
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
import { cn } from "@/lib/utils";

export function CommunityRules({ moderator = false }: { moderator?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card data-community-panel className="gap-3 rounded-2xl py-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">
            Ruang saling menjaga
          </CardTitle>
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
      <Card data-community-panel className="gap-3 rounded-2xl py-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">
            Periksa sebelum menyebarkan
          </CardTitle>
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
/** The timeline composer derives the title from the first line of the text it
 * publishes, so the feed must not print that line twice. Only exact matches are
 * removed — the check never trims text the author wrote. */
function postBody(post: CommunityPost) {
  const [first, ...rest] = post.body.split("\n");
  if (first.trim() === post.title.trim()) return rest.join("\n").trim();
  const truncated = post.title.length === 140 && !post.body.includes("\n");
  return truncated && post.body.startsWith(post.title)
    ? post.body.slice(post.title.length).trimStart()
    : post.body;
}
function AuthorAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-10 shrink-0">
      <AvatarFallback className="bg-brand-soft text-brand-ink">
        {name.trim().charAt(0).toUpperCase() || "A"}
      </AvatarFallback>
    </Avatar>
  );
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
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className="max-w-full truncate text-sm font-semibold text-txt">
        {name}
      </p>
      <p className="text-xs text-dim">
        <time dateTime={date}>{communityDate(date)}</time>
        {updated && updated !== date ? " · disunting" : ""}
      </p>
    </div>
  );
}
export function CommunityFeed({
  posts,
  total,
  query,
  canWrite,
  viewerName,
}: {
  posts: CommunityPost[];
  total: number;
  query: CommunityQuery;
  canWrite: boolean;
  viewerName?: string;
}) {
  const filtered =
    !!query.q || !!query.category || query.sort === "belum-dibalas";
  return (
    <div className="min-w-0">
      <header
        data-community-header
        className="flex min-h-14 items-center justify-between px-4 py-2"
      >
        <h1 className="text-xl font-bold">Komunitas</h1>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
        >
          <Link
            href={queryHref(query, { sort: "ramai", page: 1 })}
            aria-label="Lihat diskusi ramai"
          >
            <Sparkles aria-hidden />
          </Link>
        </Button>
      </header>
      <TimelineComposer canWrite={canWrite} viewerName={viewerName} />
      <nav
        aria-label="Urutan diskusi"
        className="grid grid-cols-3 border-b border-line"
      >
        {[
          ["terbaru", "Terbaru"],
          ["ramai", "Ramai"],
          ["belum-dibalas", "Belum dibalas"],
        ].map(([sort, label]) => (
          <Link
            key={sort}
            href={queryHref(query, {
              sort: sort as CommunityQuery["sort"],
              page: 1,
            })}
            aria-current={query.sort === sort ? "page" : undefined}
            className={cn(
              "relative flex min-h-14 items-center justify-center px-1 text-center text-sm transition-colors hover:bg-panel-2",
              query.sort === sort ? "font-bold text-txt" : "text-dim",
            )}
          >
            {label}
            {query.sort === sort && (
              <span
                aria-hidden
                className="absolute bottom-0 h-1 w-14 rounded-full bg-brand"
              />
            )}
          </Link>
        ))}
      </nav>
      <ExplorePanel defaultOpen={!!query.q || !!query.category}>
        <summary className="cursor-pointer px-4 py-3 text-sm text-brand-ink">
          Cari dan filter diskusi
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <form
            method="get"
            action="/komunitas"
            className="flex min-w-0 items-center gap-2"
          >
            <Label htmlFor="community-search" className="sr-only">
              Cari diskusi
            </Label>
            <Input
              id="community-search"
              name="q"
              defaultValue={query.q}
              placeholder="Cari di komunitas"
              maxLength={120}
              className="h-11 min-w-0 rounded-full bg-panel-2 shadow-none"
            />
            {query.category && (
              <input type="hidden" name="category" value={query.category} />
            )}
            <input type="hidden" name="sort" value={query.sort} />
            <Button
              type="submit"
              variant="outline"
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
                className="min-h-11 rounded-full px-3 text-xs"
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
        </div>
      </ExplorePanel>
      <h2 className="border-b border-line px-4 py-3 text-xs text-dim [overflow-wrap:anywhere]">
        {query.q ? `Hasil untuk “${query.q}” · ` : ""}
        {total} diskusi
      </h2>
      {posts.length ? (
        <section aria-label="Linimasa diskusi" className="divide-y divide-line">
          {posts.map((post) => (
            <article
              key={post.id}
              aria-labelledby={`post-${post.id}`}
              className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-panel-2/60"
            >
              <AuthorAvatar name={post.author} />
              <div className="min-w-0">
                <div className="-mt-2 -mr-2 flex items-start justify-between gap-1">
                  <div className="min-w-0 pt-2">
                    <Identity
                      name={post.author}
                      date={post.createdAt}
                      updated={post.updatedAt}
                    />
                  </div>
                  <ContentControls post={post} canWrite={canWrite} compact />
                </div>
                <p className="mt-0.5 text-xs text-brand-ink">
                  {CATEGORIES[post.category].label}
                </p>
                <h3
                  id={`post-${post.id}`}
                  className="mt-1 text-[15px] font-bold leading-5 [overflow-wrap:anywhere]"
                >
                  <Link
                    href={`/komunitas/${post.id}`}
                    className="hover:underline underline-offset-2"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-1 line-clamp-6 whitespace-pre-line text-[15px] leading-5 [overflow-wrap:anywhere]">
                  {postBody(post)}
                </p>
                <p className="mt-2 text-xs text-dim">
                  Dibagikan anggota · belum terverifikasi
                </p>
                <div className="-ml-3 mt-1 flex flex-wrap items-start gap-x-5">
                  <Button
                    asChild
                    variant="ghost"
                    className="min-h-11 rounded-full px-3 text-xs text-dim"
                  >
                    <Link href={`/komunitas/${post.id}#balasan`}>
                      <MessageCircle aria-hidden />
                      {post.replies} balasan
                    </Link>
                  </Button>
                  <HelpfulButton post={post} canWrite={canWrite} compact />
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <Empty className="items-start rounded-none border-0 px-8 py-10 text-left">
          <EmptyHeader className="items-start text-left">
            <EmptyTitle className="text-3xl font-extrabold leading-tight">
              {filtered
                ? "Belum ada diskusi yang cocok"
                : "Percakapan pertama bisa dimulai darimu"}
            </EmptyTitle>
            <EmptyDescription>
              {filtered
                ? "Coba kata kunci lain atau tampilkan semua diskusi."
                : "Punya cerita atau pola mencurigakan? Bagikan konteksnya agar anggota lain bisa ikut memahami."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="items-start">
            <Button asChild className="min-h-11 rounded-full px-5 font-bold">
              <Link
                href={
                  filtered
                    ? "/komunitas"
                    : canWrite
                      ? "/komunitas/baru"
                      : "/masuk"
                }
              >
                {filtered
                  ? "Lihat semua diskusi"
                  : canWrite
                    ? "Mulai diskusi"
                    : "Masuk untuk berdiskusi"}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      <div className="px-4">
        <Pagination
          page={query.page}
          total={total}
          size={PAGE_SIZE}
          href={(page) => queryHref(query, { page })}
        />
      </div>
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
    <div className="w-full min-w-0 pb-8">
      <div>
        <div
          data-community-header
          className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2"
        >
          <Button asChild variant="ghost" className="min-h-11 rounded-full">
            <Link href="/komunitas">
              <ArrowLeft aria-hidden />
              Semua diskusi
            </Link>
          </Button>
        </div>
        <article
          aria-labelledby="thread-title"
          className="min-w-0 px-4 py-5 sm:px-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <AuthorAvatar name={post.author} />
            <Identity
              name={post.author}
              date={post.createdAt}
              updated={post.updatedAt}
            />
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-brand-soft text-brand-ink">
              {CATEGORIES[post.category].label}
            </Badge>
          </div>
          <h1
            id="thread-title"
            className="break-words text-2xl font-semibold leading-snug [overflow-wrap:anywhere]"
          >
            {post.title}
          </h1>
          {postBody(post) && (
            <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed [overflow-wrap:anywhere]">
              {postBody(post)}
            </p>
          )}
          {post.sourceUrl && (
            <div className="mt-4 min-w-0 rounded-2xl bg-panel-2 p-4">
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
          <p className="mt-5 text-xs text-dim">
            Dibagikan anggota · belum terverifikasi
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-3 text-sm text-dim">
            <span>
              <strong className="font-semibold text-txt">{post.replies}</strong>{" "}
              balasan
            </span>
            <span>
              <strong className="font-semibold text-txt">{post.helpful}</strong>{" "}
              membantu
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <HelpfulButton post={post} canWrite={canWrite} compact />
            <ContentControls post={post} canWrite={canWrite} />
          </div>
        </article>
        <section
          id="balasan"
          aria-labelledby="replies-title"
          className="min-w-0 scroll-mt-4 border-t border-line"
        >
          <div className="border-b border-line px-4 py-5 sm:px-6">
            <h2 id="replies-title" className="mb-4 text-base font-semibold">
              Ikut berdiskusi
            </h2>
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
          </div>
          <h3 className="border-b border-line px-4 py-3 text-sm font-medium sm:px-6">
            Balasan <span className="ml-1 text-dim">· {post.replies}</span>
          </h3>
          {replies.length ? (
            <div className="divide-y divide-line">
              {replies.map((reply, index) => (
                <article
                  key={reply.id}
                  aria-label={`Balasan dari ${reply.author}`}
                  className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-5 sm:px-6"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AuthorAvatar name={reply.author} />
                    {index < replies.length - 1 && (
                      <span
                        aria-hidden
                        className="min-h-6 w-px flex-1 bg-line"
                      />
                    )}
                  </div>
                  <div className="min-w-0 space-y-3">
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
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-sm leading-relaxed text-dim sm:px-6">
              Belum ada balasan. Bagikan sudut pandangmu dengan tetap
              menghormati penulis.
            </p>
          )}
          <div className="px-4 sm:px-6">
            <Pagination
              page={page}
              total={post.replies}
              size={REPLY_PAGE_SIZE}
              href={(p) => `/komunitas/${post.id}?page=${p}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

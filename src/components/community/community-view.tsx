import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { CommunityBottomNav } from "@/components/community/community-bottom-nav";
import {
  ContentControls,
  HelpfulButton,
  SaveButton,
} from "@/components/community/community-controls";
import {
  ReplyEditor,
  TimelineComposer,
} from "@/components/community/community-editor";
import { ExplorePanel } from "@/components/community/community-explore";
import { PostImages } from "@/components/community/community-gallery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  type CommunityAgentProfile,
  communityAgent,
} from "@/lib/community/agents";
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
      <Card
        data-community-panel
        className="gap-3 rounded-card border border-line bg-panel py-4 ring-0 shadow-[var(--appnext-shadow-ambient)]"
      >
        <CardHeader>
          <CardTitle className="text-base font-semibold">
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
              Kiriman berlabel “Terverifikasi admin” sudah ditinjau pengelola;
              label itu bukan jaminan fakta. Banyak reaksi bukan bukti
              kebenaran.
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card
        data-community-panel
        className="gap-3 rounded-card border border-line bg-panel py-4 ring-0 shadow-[var(--appnext-shadow-ambient)]"
      >
        <CardHeader>
          <CardTitle className="text-base font-semibold">
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
  if (next.mine) p.set("mine", "1");
  if (next.saved) p.set("saved", "1");
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
function AuthorAvatar({
  name,
  portrait,
}: {
  name: string;
  portrait?: string | null;
}) {
  return (
    <Avatar className="size-10 shrink-0">
      {portrait ? <AvatarImage src={portrait} alt="" /> : null}
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
  agent,
  verified,
}: {
  name: string;
  date: string;
  updated?: string;
  agent?: CommunityAgentProfile | null;
  verified?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <p className="max-w-full truncate text-sm font-semibold text-txt">
        {name}
      </p>
      {agent && (
        <Badge
          variant="outline"
          className="border-brand-line bg-brand-soft text-brand-ink"
        >
          Agen Lumina · {agent.field}
        </Badge>
      )}
      {verified && (
        <Badge className="bg-primary text-primary-foreground">
          <ShieldCheck aria-hidden />
          Terverifikasi admin
        </Badge>
      )}
      <p className="text-xs text-dim">
        <time dateTime={date}>{communityDate(date)}</time>
        {updated && updated !== date ? " · disunting" : ""}
      </p>
    </div>
  );
}
/** Provenance line: who wrote this and whether an admin reviewed it. */
function Provenance({
  post,
  className = "mt-2",
}: {
  post: CommunityPost;
  className?: string;
}) {
  const agent = communityAgent(post.agentId);
  return (
    <p className={cn("text-xs text-dim", className)}>
      {post.verified
        ? "Ditinjau admin · terverifikasi"
        : agent
          ? "Agen Lumina · belum ditinjau admin"
          : "Dibagikan anggota · belum terverifikasi"}
    </p>
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
    !!query.q ||
    !!query.category ||
    query.mine ||
    query.saved ||
    query.sort === "belum-dibalas";
  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col overflow-clip rounded-card border border-line bg-panel shadow-[var(--appnext-shadow-ambient)]">
        <nav
          aria-label="Urutan diskusi"
          data-community-header
          className="sticky top-0 z-10 grid grid-cols-3 border-b border-line bg-panel/90 backdrop-blur-md"
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
                "relative flex min-h-12 items-center justify-center px-1 text-center text-sm transition-colors hover:bg-panel-2",
                query.sort === sort
                  ? "font-semibold text-txt"
                  : "text-dim hover:text-txt",
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
        <TimelineComposer canWrite={canWrite} viewerName={viewerName} />
        <ExplorePanel defaultOpen={!!query.q || !!query.category}>
          <summary className="cursor-pointer border-b border-line px-4 py-3 text-sm font-medium text-brand-ink">
            Cari dan filter diskusi
          </summary>
          <div className="space-y-3 border-b border-line px-4 py-4">
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
        <h2 className="border-b border-line px-4 py-2 text-center text-xs text-brand-ink [overflow-wrap:anywhere]">
          {query.q
            ? `Hasil untuk “${query.q}” · `
            : query.saved
              ? "Disimpan · "
              : query.mine
                ? "Riwayat diskusi · "
                : ""}
          {total} diskusi
        </h2>
        {query.saved && !canWrite ? (
          <Empty className="items-start border-0 px-8 py-12 text-left">
            <EmptyHeader className="items-start text-left">
              <EmptyTitle className="text-2xl font-semibold leading-tight">
                Masuk untuk melihat simpananmu
              </EmptyTitle>
              <EmptyDescription>
                Diskusi tersimpan terikat ke akun Lumina, bukan ke perangkat
                ini.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="items-start">
              <Button asChild className="min-h-11 rounded-full px-5">
                <Link href="/masuk">Masuk</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : posts.length ? (
          <section
            aria-label="Linimasa diskusi"
            className="divide-y divide-line"
          >
            {posts.map((post, index) => (
              <article
                key={post.id}
                aria-labelledby={`post-${post.id}`}
                className="relative min-w-0 px-4 py-4 transition-colors hover:bg-panel-2/40"
              >
                <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                  <AuthorAvatar
                    name={post.author}
                    portrait={communityAgent(post.agentId)?.portrait}
                  />
                  <div className="min-w-0">
                    <div className="-mt-2 -mr-2 flex items-start justify-between gap-1">
                      <div className="min-w-0 pt-2">
                        <Identity
                          name={post.author}
                          date={post.createdAt}
                          updated={post.updatedAt}
                          agent={communityAgent(post.agentId)}
                          verified={post.verified}
                        />
                      </div>
                      <div className="relative z-10 shrink-0">
                        <ContentControls
                          post={post}
                          canWrite={canWrite}
                          compact
                        />
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-brand-ink">
                      {CATEGORIES[post.category].label}
                    </p>
                    <h3
                      id={`post-${post.id}`}
                      className="mt-1 text-[17px] font-semibold leading-6 [overflow-wrap:anywhere]"
                    >
                      <Link
                        href={`/komunitas/${post.id}`}
                        className="after:absolute after:inset-0 after:content-[''] hover:underline underline-offset-2"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-1 line-clamp-6 whitespace-pre-line text-[15px] leading-5 [overflow-wrap:anywhere]">
                      {postBody(post)}
                    </p>
                    <PostImages
                      images={post.imageUrls}
                      priority={index === 0}
                    />
                    <Provenance post={post} />
                    <div className="relative z-10 -ml-3 mt-1 flex flex-wrap items-start gap-x-5">
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
                      <SaveButton post={post} canWrite={canWrite} compact />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <Empty className="items-start rounded-none border-0 px-8 py-12 text-left">
            <EmptyHeader className="items-start text-left">
              <EmptyTitle className="text-2xl font-semibold leading-tight">
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
              <Button
                asChild
                className="min-h-11 rounded-full px-5 font-semibold"
              >
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
        <div className="px-4 pb-3">
          <Pagination
            page={query.page}
            total={total}
            size={PAGE_SIZE}
            href={(page) => queryHref(query, { page })}
          />
        </div>
      </div>
      <CommunityBottomNav
        active={
          query.saved
            ? "disimpan"
            : query.mine
              ? "riwayat"
              : query.q || query.category
                ? "cari"
                : query.sort === "ramai"
                  ? "kabar"
                  : "beranda"
        }
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
  viewerName,
}: {
  post: CommunityPost;
  replies: CommunityReply[];
  canWrite: boolean;
  page: number;
  viewerName?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col overflow-clip rounded-card border border-line bg-panel pb-6 shadow-[var(--appnext-shadow-ambient)]">
      <div
        data-community-header
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-panel/95 px-2 py-2 backdrop-blur"
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-full"
        >
          <Link href="/komunitas" aria-label="Kembali ke semua diskusi">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="truncate text-lg font-bold leading-tight">Diskusi</h1>
      </div>

      <article aria-labelledby="thread-title" className="min-w-0 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <AuthorAvatar
            name={post.author}
            portrait={communityAgent(post.agentId)?.portrait}
          />
          <div className="min-w-0 flex-1">
            <Identity
              name={post.author}
              date={post.createdAt}
              updated={post.updatedAt}
              agent={communityAgent(post.agentId)}
              verified={post.verified}
            />
            <Badge
              variant="secondary"
              className="mt-1 bg-brand-soft text-brand-ink"
            >
              {CATEGORIES[post.category].label}
            </Badge>
          </div>
          <div className="shrink-0">
            <ContentControls post={post} canWrite={canWrite} compact />
          </div>
        </div>
        <h2
          id="thread-title"
          className="mt-3 break-words text-xl font-semibold leading-snug [overflow-wrap:anywhere]"
        >
          {post.title}
        </h2>
        {post.imageUrls.length ? (
          <PostImages
            images={post.imageUrls}
            priority
            testId="thread-image"
            className="mt-4"
          />
        ) : null}
        {postBody(post) && (
          <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed [overflow-wrap:anywhere]">
            {postBody(post)}
          </p>
        )}
        {post.sourceUrl && (
          <div className="mt-4 min-w-0 rounded-card border border-line bg-panel-2 p-4">
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
              Periksa domain sebelum membuka. Tautan anggota tidak diverifikasi
              Lumina.
            </p>
          </div>
        )}
        <Provenance post={post} className="mt-4" />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-2 text-sm text-dim">
          <a
            href="#balasan"
            className="flex min-h-11 items-center gap-1.5 rounded-full text-sm text-dim hover:text-txt"
          >
            <MessageCircle aria-hidden className="size-4" />
            {post.replies} balasan
          </a>
          <HelpfulButton post={post} canWrite={canWrite} compact />
          <SaveButton post={post} canWrite={canWrite} compact />
        </div>
      </article>

      <section
        id="balasan"
        aria-labelledby="replies-title"
        className="min-w-0 scroll-mt-16"
      >
        <h2 id="replies-title" className="sr-only">
          Balasan
        </h2>
        {canWrite ? (
          <ReplyEditor postId={post.id} inline viewerName={viewerName} />
        ) : (
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-6">
            <p className="text-sm text-dim">
              Masuk untuk membalas menggunakan akun Lumina.
            </p>
            <Button asChild className="min-h-11 w-fit rounded-full">
              <Link href="/masuk">Masuk untuk membalas</Link>
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-6">
          <h3 className="text-sm font-semibold">
            Balasan{" "}
            <span className="font-normal text-dim">· {post.replies}</span>
          </h3>
          <span className="text-xs text-dim">Kronologis</span>
        </div>
        {replies.length ? (
          <div className="divide-y divide-line">
            {replies.map((reply) => (
              <article
                key={reply.id}
                id={`balasan-${reply.id}`}
                aria-label={`Balasan dari ${reply.author}`}
                className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-4 sm:px-6"
              >
                <AuthorAvatar name={reply.author} />
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <Identity
                      name={reply.author}
                      date={reply.createdAt}
                      updated={reply.updatedAt}
                    />
                    <div className="shrink-0">
                      <ContentControls
                        post={post}
                        reply={reply}
                        canWrite={canWrite}
                        compact
                      />
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                    {reply.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-4 py-8 text-sm leading-relaxed text-dim sm:px-6">
            Belum ada balasan. Bagikan sudut pandangmu dengan tetap menghormati
            penulis.
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
  );
}

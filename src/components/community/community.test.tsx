import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityAside } from "@/components/community/community-aside";
import {
  PostEditor,
  ReplyEditor,
  TimelineComposer,
} from "@/components/community/community-editor";
import { EXPLORE_EVENT } from "@/components/community/community-explore";
import {
  CommunityFeed,
  CommunityThread,
} from "@/components/community/community-view";
import {
  markHelpful,
  publishPost,
  publishReply,
} from "@/lib/community/actions";
import { type CommunityPost, QuerySchema } from "@/lib/community/schema";

jest.mock("@/lib/community/actions", () => ({
  publishPost: jest.fn(),
  publishReply: jest.fn(),
  markHelpful: jest.fn(),
  deleteContent: jest.fn(),
  flagContent: jest.fn(),
  moderateContent: jest.fn(),
}));
jest.mock("@/lib/auth/actions", () => ({ logout: jest.fn() }));
const push = jest.fn(),
  refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/komunitas",
}));
const post: CommunityPost = {
  id: "892e48bd-9178-461d-bd83-c32fc614bb23",
  author: "Rina",
  authorKind: "member",
  agentId: null,
  verified: false,
  category: "modus-baru",
  title: "Pesan kurir meminta APK baru",
  body: "Pesan mengaku kurir meminta memasang aplikasi. Bagaimana cara memeriksanya?",
  sourceUrl: null,
  imageUrls: [],
  createdAt: "2026-11-09T06:00:00Z",
  updatedAt: "2026-11-09T06:00:00Z",
  replies: 0,
  helpful: 0,
  hasHelped: false,
  hasSaved: false,
  isOwner: false,
  hidden: false,
};

it("navigates a new reply to its actual page and anchor", async () => {
  const replyId = "892e48bd-9178-461d-bd83-c32fc614bb24";
  jest
    .mocked(publishReply)
    .mockResolvedValueOnce({ ok: true, id: post.id, replyId, page: 2 });
  const user = userEvent.setup();
  render(<ReplyEditor postId={post.id} inline />);
  await user.type(
    screen.getByRole("textbox", { name: "Tulis balasan" }),
    "Balasan baru setelah halaman pertama penuh.",
  );
  await user.click(screen.getByRole("button", { name: "Kirim balasan" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      `/komunitas/${post.id}?page=2#balasan-${replyId}`,
    ),
  );
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(publishPost).mockResolvedValue({ ok: true, id: post.id });
  jest.mocked(publishReply).mockResolvedValue({ ok: true, id: post.id });
  jest.mocked(markHelpful).mockResolvedValue({ ok: true });
});
it("renders an honest empty state and login entry instead of invented discussions", () => {
  render(
    <CommunityFeed
      posts={[]}
      total={0}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  expect(
    screen.getByText("Percakapan pertama bisa dimulai darimu"),
  ).toBeInTheDocument();
  expect(screen.getByText("0 diskusi")).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link", { name: /masuk untuk berdiskusi/i })
      .every((a) => a.getAttribute("href") === "/masuk"),
  ).toBe(true);
});
it("links real posts and renders user text as text rather than HTML", () => {
  render(
    <CommunityFeed
      posts={[{ ...post, title: "<script>alert(1)</script> modus baru" }]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(screen.getByRole("link", { name: /<script>/ })).toHaveAttribute(
    "href",
    `/komunitas/${post.id}`,
  );
  expect(document.querySelector("script")).toBeNull();
  expect(screen.getByText(/belum terverifikasi/)).toBeInTheDocument();
});
it("renders a seed cover on the timeline and the thread", () => {
  const covered = {
    ...post,
    imageUrls: ["/images/community/qris-palsu.jpg"],
  };
  const feed = render(
    <CommunityFeed
      posts={[covered]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(
    feed.getByTestId("post-image").querySelector("img")?.getAttribute("src"),
  ).toContain("qris-palsu");
  feed.unmount();
  const thread = render(
    <CommunityThread post={covered} replies={[]} canWrite={false} page={1} />,
  );
  expect(
    thread
      .getByTestId("thread-image")
      .querySelector("img")
      ?.getAttribute("src"),
  ).toContain("qris-palsu");
});
it("offers a saved-posts nav entry and gates it for guests", () => {
  const { unmount } = render(
    <CommunityFeed
      posts={[post]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(screen.getByRole("link", { name: "Disimpan" })).toHaveAttribute(
    "href",
    "/komunitas?saved=1",
  );
  expect(
    screen.getByRole("button", { name: "Simpan diskusi ini" }),
  ).toBeInTheDocument();
  unmount();
  render(
    <CommunityFeed
      posts={[post]}
      total={1}
      query={QuerySchema.parse({ saved: "1" })}
      canWrite={false}
    />,
  );
  expect(
    screen.getByText("Masuk untuk melihat simpananmu"),
  ).toBeInTheDocument();
});
it("opens a multi-image preview and walks the gallery", async () => {
  const user = userEvent.setup();
  const gallery = {
    ...post,
    imageUrls: [
      "/images/community/qris-palsu.jpg",
      "/images/community/tagihan-listrik.jpg",
      "/images/community/telepon-otp.jpg",
    ],
  };
  render(
    <CommunityFeed
      posts={[gallery]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  await user.click(
    screen.getByRole("button", {
      name: /buka pratinjau gambar 1 dari 3/i,
    }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
  await user.click(
    within(dialog).getByRole("button", { name: "Gambar berikutnya" }),
  );
  expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
  await user.click(
    within(dialog).getByRole("button", { name: "Tutup pratinjau" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});
it("renders no cover for a post without one", () => {
  render(
    <CommunityFeed
      posts={[post]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(screen.queryByTestId("post-image")).toBeNull();
});
it("creates a topic with selected category and redirects to its persisted id", async () => {
  const user = userEvent.setup();
  render(<PostEditor />);
  await user.click(screen.getByRole("button", { name: "Tanya komunitas" }));
  await user.type(screen.getByLabelText("Judul diskusi"), post.title);
  await user.type(screen.getByLabelText("Ceritakan konteksnya"), post.body);
  await user.click(screen.getByRole("button", { name: "Terbitkan diskusi" }));
  await waitFor(() =>
    expect(publishPost).toHaveBeenCalledWith(
      expect.objectContaining({
        title: post.title,
        body: post.body,
        category: "pertanyaan",
      }),
    ),
  );
  expect(push).toHaveBeenCalledWith(`/komunitas/${post.id}`);
});
it("keeps input and displays a retryable save error", async () => {
  jest
    .mocked(publishPost)
    .mockResolvedValue({ ok: false, error: "Perubahan belum tersimpan." });
  const user = userEvent.setup();
  render(<PostEditor />);
  await user.type(screen.getByLabelText("Judul diskusi"), post.title);
  await user.type(screen.getByLabelText("Ceritakan konteksnya"), post.body);
  await user.click(screen.getByRole("button", { name: "Terbitkan diskusi" }));
  expect(
    await screen.findByText("Perubahan belum tersimpan."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Ceritakan konteksnya")).toHaveValue(post.body);
  expect(push).not.toHaveBeenCalled();
});
it("places the inline reply composer above the reply list", () => {
  render(
    <CommunityThread
      post={{ ...post, replies: 1 }}
      replies={[
        {
          id: "reply-order",
          author: "Anggota lain",
          body: "Balasan uji untuk urutan.",
          createdAt: post.createdAt,
          updatedAt: post.createdAt,
          isOwner: false,
        },
      ]}
      canWrite
      page={1}
      viewerName="Rina"
    />,
  );
  const composer = screen.getByRole("textbox", { name: "Tulis balasan" });
  const reply = screen.getByRole("article", {
    name: "Balasan dari Anggota lain",
  });
  expect(
    composer.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
it("persists a reply and helpful reaction from the real thread controls", async () => {
  const user = userEvent.setup();
  render(<CommunityThread post={post} replies={[]} canWrite page={1} />);
  await user.type(
    screen.getByLabelText("Tulis balasan"),
    "Periksa kabar paket lewat aplikasi resmi.",
  );
  await user.click(screen.getByRole("button", { name: "Kirim balasan" }));
  await waitFor(() =>
    expect(publishReply).toHaveBeenCalledWith({
      id: undefined,
      postId: post.id,
      body: "Periksa kabar paket lewat aplikasi resmi.",
    }),
  );
  await user.click(screen.getByRole("button", { name: /^membantu/i }));
  await waitFor(() =>
    expect(markHelpful).toHaveBeenCalledWith({ id: post.id, value: true }),
  );
});

it("preserves search and category when switching timeline tabs, and resets pagination", () => {
  render(
    <CommunityFeed
      posts={[post]}
      total={25}
      query={QuerySchema.parse({
        q: "kurir APK",
        category: "modus-baru",
        sort: "ramai",
        page: 2,
      })}
      canWrite
    />,
  );
  const tabs = within(
    screen.getByRole("navigation", { name: "Urutan diskusi" }),
  );
  expect(tabs.getByRole("link", { name: "Ramai" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(tabs.getByRole("link", { name: "Terbaru" })).toHaveAttribute(
    "href",
    "/komunitas?q=kurir+APK&category=modus-baru",
  );
  expect(screen.getByRole("link", { name: "Berikutnya" })).toHaveAttribute(
    "href",
    "/komunitas?q=kurir+APK&category=modus-baru&sort=ramai&page=3",
  );
  expect(screen.getByRole("link", { name: "Tanya komunitas" })).toHaveAttribute(
    "href",
    "/komunitas?q=kurir+APK&category=pertanyaan&sort=ramai",
  );
  const search = screen.getByRole("textbox", { name: "Cari diskusi" });
  expect(search).toHaveValue("kurir APK");
  expect(search.closest("form")).toHaveAttribute("method", "get");
  const fields = new FormData(search.closest("form") as HTMLFormElement);
  expect(fields.get("category")).toBe("modus-baru");
  expect(fields.get("sort")).toBe("ramai");
});

it("reacts from the timeline, surfaces a save failure, and keeps links separate from buttons", async () => {
  jest
    .mocked(markHelpful)
    .mockResolvedValueOnce({ ok: false, error: "Reaksi belum tersimpan." });
  const user = userEvent.setup();
  const { container, rerender } = render(
    <CommunityFeed
      posts={[post]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(screen.getByRole("link", { name: "0 balasan" })).toHaveAttribute(
    "href",
    `/komunitas/${post.id}#balasan`,
  );
  await user.click(screen.getByRole("button", { name: "Membantu · 0" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Reaksi belum tersimpan.",
  );
  await user.click(screen.getByRole("button", { name: "Membantu · 0" }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(markHelpful).toHaveBeenLastCalledWith({ id: post.id, value: true });
  rerender(
    <CommunityFeed
      posts={[{ ...post, hasHelped: true, helpful: 1 }]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  expect(
    screen.getByRole("button", { name: "Sudah membantu · 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Sudah membantu · 1" }));
  await waitFor(() =>
    expect(markHelpful).toHaveBeenLastCalledWith({ id: post.id, value: false }),
  );
  expect(container.querySelector("a a, a button, button a")).toBeNull();
});

it("offers a way back to all discussions when the unanswered timeline is empty", () => {
  render(
    <CommunityFeed
      posts={[]}
      total={0}
      query={QuerySchema.parse({ sort: "belum-dibalas" })}
      canWrite={false}
    />,
  );
  expect(screen.getByText("Belum ada diskusi yang cocok")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Lihat semua diskusi" }),
  ).toHaveAttribute("href", "/komunitas");
});

it("renders replies safely and gates reactions and writing for guests", () => {
  const { container } = render(
    <CommunityThread
      post={{ ...post, replies: 1, sourceUrl: "https://example.com/informasi" }}
      replies={[
        {
          id: "reply-1",
          author: "Anggota lain",
          body: '<img src=x onerror="alert(1)"> Periksa dari aplikasi resmi.',
          createdAt: post.createdAt,
          updatedAt: post.createdAt,
          isOwner: false,
        },
      ]}
      canWrite={false}
      page={1}
    />,
  );
  expect(
    screen.getByRole("link", { name: "Masuk untuk membalas" }),
  ).toHaveAttribute("href", "/masuk");
  expect(
    screen.getByRole("link", { name: /Masuk untuk memberi reaksi/ }),
  ).toHaveAttribute("href", "/masuk");
  expect(
    screen.queryByRole("textbox", { name: "Tulis balasan" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("article", { name: "Balasan dari Anggota lain" }),
  ).toHaveTextContent('<img src=x onerror="alert(1)">');
  expect(container.querySelector("img")).toBeNull();
  expect(
    screen.getByRole("link", { name: "https://example.com/informasi" }),
  ).toHaveAttribute("rel", "nofollow noopener noreferrer ugc");
  expect(container.querySelector("#balasan")).toBeInTheDocument();
});

it("publishes from the clone composer with a derived title and clears only after success", async () => {
  const user = userEvent.setup();
  jest
    .mocked(publishPost)
    .mockResolvedValueOnce({ ok: false, error: "Topik belum tersimpan." });
  render(<TimelineComposer canWrite viewerName="Rina" />);
  const field = screen.getByRole("textbox", {
    name: "Apa yang sedang terjadi?",
  });
  expect(screen.getByRole("button", { name: "Posting" })).toBeDisabled();
  const body =
    "Pesan kurir meminta APK baru\nJangan memasang file dari nomor asing. Apakah ada cara lain memeriksanya?";
  await user.type(field, body);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Jenis diskusi" }),
    "pertanyaan",
  );
  await user.click(screen.getByRole("button", { name: "Posting" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Topik belum tersimpan.",
  );
  expect(field).toHaveValue(body);
  expect(publishPost).toHaveBeenCalledWith({
    title: "Pesan kurir meminta APK baru",
    body,
    category: "pertanyaan",
    sourceUrl: "",
  });
  await user.click(screen.getByRole("button", { name: "Posting" }));
  await waitFor(() => expect(field).toHaveValue(""));
  expect(refresh).toHaveBeenCalled();
});

it("opens author editing from the timeline options menu", async () => {
  const user = userEvent.setup();
  render(
    <CommunityFeed
      posts={[{ ...post, isOwner: true }]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Opsi kiriman oleh Rina" }),
  );
  await user.click(screen.getByRole("menuitem", { name: "Ubah" }));
  const editor = within(screen.getByRole("dialog", { name: "Ubah diskusi" }));
  expect(editor.getByLabelText("Judul diskusi")).toHaveValue(post.title);
  await user.clear(editor.getByLabelText("Judul diskusi"));
  await user.type(
    editor.getByLabelText("Judul diskusi"),
    "Pesan kurir meminta berkas APK",
  );
  await user.click(editor.getByRole("button", { name: "Simpan perubahan" }));
  await waitFor(() =>
    expect(publishPost).toHaveBeenCalledWith(
      expect.objectContaining({
        id: post.id,
        title: "Pesan kurir meminta berkas APK",
      }),
    ),
  );
});

it("does not print a composer-derived title twice in the timeline body", () => {
  render(
    <CommunityFeed
      posts={[
        {
          ...post,
          title: "Pesan kurir meminta APK",
          body: "Pesan kurir meminta APK\nNomor asing mengirim tautan pemasangan.",
        },
      ]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  expect(screen.getAllByText("Pesan kurir meminta APK")).toHaveLength(1);
  expect(
    screen.getByText("Nomor asing mengirim tautan pemasangan."),
  ).toBeInTheDocument();
});

it("labels an agent post with its field and an admin-verified badge", () => {
  render(
    <CommunityFeed
      posts={[
        {
          ...post,
          author: "Mochi",
          authorKind: "agent",
          agentId: "message",
          verified: true,
        },
      ]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  expect(screen.getByText("Mochi")).toBeInTheDocument();
  expect(
    screen.getByText("Agen Lumina · Pesan & rekayasa sosial"),
  ).toBeInTheDocument();
  expect(screen.getByText("Terverifikasi admin")).toBeInTheDocument();
  expect(
    screen.getByText("Ditinjau admin · terverifikasi"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Dibagikan anggota · belum terverifikasi"),
  ).not.toBeInTheDocument();
});

it("does not claim an unverified agent post was approved", () => {
  render(
    <CommunityFeed
      posts={[
        {
          ...post,
          author: "Bao",
          authorKind: "agent",
          agentId: "evidence",
          verified: false,
        },
      ]}
      total={1}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  expect(
    screen.getByText("Agen Lumina · Bukti & pelaporan"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Agen Lumina · belum ditinjau admin"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Terverifikasi admin")).not.toBeInTheDocument();
});

it("opens the filter panel when the rail asks for it, and never hides text", async () => {
  render(
    <CommunityFeed
      posts={[]}
      total={0}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  const panel = document.querySelector(
    "details#jelajahi",
  ) as HTMLDetailsElement;
  expect(panel.open).toBe(false);
  await act(async () => {
    window.dispatchEvent(new Event(EXPLORE_EVENT));
  });
  await waitFor(() => expect(panel.open).toBe(true));
  expect(screen.getByRole("textbox", { name: "Cari diskusi" })).toBeVisible();
  await act(async () => {
    window.location.hash = "";
  });
});

it("opens the filter panel when the page is opened at the explore hash", async () => {
  window.location.hash = "#jelajahi";
  render(
    <CommunityFeed
      posts={[]}
      total={0}
      query={QuerySchema.parse({})}
      canWrite={false}
    />,
  );
  const panel = document.querySelector(
    "details#jelajahi",
  ) as HTMLDetailsElement;
  await waitFor(() => expect(panel.open).toBe(true));
  await act(async () => {
    window.location.hash = "";
  });
});

it("renders the X-style community rail with news, trends, and the moderator entry", () => {
  render(<CommunityAside moderator latest={[post]} trending={[post]} />);
  expect(
    screen.getByRole("textbox", { name: "Cari di komunitas" }),
  ).toHaveAttribute("placeholder", "Cari di komunitas");
  expect(screen.getByText("Kabar komunitas")).toBeInTheDocument();
  expect(screen.getByText("Yang sedang dibahas")).toBeInTheDocument();
  expect(
    screen.getAllByRole("link", { name: post.title }).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "Lihat semua" })).toHaveAttribute(
    "href",
    "/komunitas?sort=ramai",
  );
  expect(
    screen.getByRole("link", { name: "Tinjau laporan komunitas" }),
  ).toHaveAttribute("href", "/komunitas/moderasi");
  expect(
    screen.queryByRole("link", { name: "Tentang Lumina" }),
  ).not.toBeInTheDocument();
});

it("dismisses the news card and gates the moderator entry for guests", async () => {
  const user = userEvent.setup();
  render(<CommunityAside latest={[post]} trending={[post]} />);
  await user.click(
    screen.getByRole("button", { name: "Tutup kabar komunitas" }),
  );
  expect(screen.queryByText("Kabar komunitas")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Tinjau laporan komunitas" }),
  ).not.toBeInTheDocument();
});

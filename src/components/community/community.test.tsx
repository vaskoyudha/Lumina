import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PostEditor,
  TimelineComposer,
} from "@/components/community/community-editor";
import { EXPLORE_EVENT } from "@/components/community/community-explore";
import { CommunityFrame } from "@/components/community/community-frame";
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
  category: "modus-baru",
  title: "Pesan kurir meminta APK baru",
  body: "Pesan mengaku kurir meminta memasang aplikasi. Bagaimana cara memeriksanya?",
  sourceUrl: null,
  createdAt: "2026-11-09T06:00:00Z",
  updatedAt: "2026-11-09T06:00:00Z",
  replies: 0,
  helpful: 0,
  hasHelped: false,
  isOwner: false,
  hidden: false,
};
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

it("keeps the cloned shell navigation connected to real Lumina routes for guests", async () => {
  const user = userEvent.setup();
  render(
    <CommunityFrame session={null}>
      <CommunityFeed
        posts={[]}
        total={0}
        query={QuerySchema.parse({})}
        canWrite={false}
      />
    </CommunityFrame>,
  );
  const nav = within(
    screen.getByRole("navigation", { name: "Navigasi komunitas" }),
  );
  expect(nav.getByRole("link", { name: "Beranda" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(nav.getByRole("link", { name: "Profil" })).toHaveAttribute(
    "href",
    "/masuk",
  );
  expect(nav.getByRole("link", { name: "Companion" })).toHaveAttribute(
    "href",
    "/companion",
  );
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: /Percakapan baru/ }),
  ).not.toBeInTheDocument();
  await user.click(nav.getByRole("button", { name: "Menu komunitas" }));
  expect(screen.getByRole("menuitem", { name: "Belajar" })).toHaveAttribute(
    "href",
    "/belajar",
  );
  expect(screen.getByRole("menuitem", { name: "Simulasi" })).toHaveAttribute(
    "href",
    "/simulasi",
  );
});

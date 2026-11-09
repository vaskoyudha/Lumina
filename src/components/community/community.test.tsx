import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostEditor } from "@/components/community/community-editor";
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
const push = jest.fn(),
  refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
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

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileDialog } from "@/components/profil/profile-dialog";

jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

jest.mock("@/lib/auth/actions", () => ({
  logout: jest.fn(),
}));

const session = {
  nama: "Siti Rahma",
  email: "siti@lumina.id",
  createdAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      account: session,
      hasPassword: true,
      sessions: [],
    }),
  }) as unknown as typeof fetch;
});

beforeAll(() => {
  const target = window.HTMLElement.prototype as unknown as {
    hasPointerCapture?: () => boolean;
    releasePointerCapture?: () => void;
    scrollIntoView?: () => void;
  };
  target.hasPointerCapture ??= () => false;
  target.releasePointerCapture ??= () => {};
  target.scrollIntoView ??= () => {};
});

describe("ProfileDialog settings shell", () => {
  it("opens as Pengaturan and exposes the four sections as tabs", async () => {
    render(
      <ProfileDialog
        session={session}
        section="profil"
        onOpenChange={jest.fn()}
      />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(/pengaturan/i);
    expect(
      within(dialog).getByRole("tab", { name: /^akun$/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(dialog).getByRole("tab", { name: /kemajuan/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: /lowongan/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: /privasi/i }),
    ).toBeInTheDocument();
  });

  it("switches panels by click and by arrow key", async () => {
    const user = userEvent.setup();
    render(
      <ProfileDialog
        session={session}
        section="profil"
        onOpenChange={jest.fn()}
      />,
    );

    const akun = await screen.findByRole("tab", { name: /^akun$/i });
    const kemajuan = screen.getByRole("tab", { name: /kemajuan/i });

    await user.click(kemajuan);
    expect(kemajuan).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: /kemajuan belajar/i }),
    ).toBeVisible();

    akun.focus();
    await user.keyboard("{ArrowDown}");
    expect(kemajuan).toHaveAttribute("aria-selected", "true");
  });

  it("keeps identity and the created date in the account panel", async () => {
    render(
      <ProfileDialog
        session={session}
        section="profil"
        onOpenChange={jest.fn()}
      />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getAllByText("siti@lumina.id").length,
    ).toBeGreaterThan(0);
    expect(within(dialog).getByText("2 Januari 2026")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/jenis akun/i).length).toBeGreaterThan(
      0,
    );
  });
});

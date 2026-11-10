import { render, screen, waitFor, within } from "@testing-library/react";
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
  updateNama: jest.fn(),
  changePasswordAction: jest.fn(),
  revokeSessionAction: jest.fn(),
  logoutEverywhere: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
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

  it("saves a new display name and refreshes the identity row", async () => {
    const { updateNama } = jest.requireMock("@/lib/auth/actions");
    updateNama.mockResolvedValue({
      ok: true,
      account: { nama: "Siti Baru", email: "siti@lumina.id" },
    });
    const user = userEvent.setup();
    render(
      <ProfileDialog
        session={session}
        section="profil"
        onOpenChange={jest.fn()}
      />,
    );

    const input = await screen.findByLabelText(/nama tampilan/i);
    await user.clear(input);
    await user.type(input, "Siti Baru");
    await user.click(screen.getByRole("button", { name: /simpan nama/i }));

    expect(updateNama).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(/diperbarui/i);
    expect(screen.getAllByText("Siti Baru").length).toBeGreaterThan(0);
  });

  it("shows a password error from the action", async () => {
    const { changePasswordAction } = jest.requireMock("@/lib/auth/actions");
    changePasswordAction.mockResolvedValue({
      ok: false,
      error: "Password saat ini salah.",
    });
    const user = userEvent.setup();
    render(
      <ProfileDialog
        session={session}
        section="profil"
        onOpenChange={jest.fn()}
      />,
    );

    await user.type(await screen.findByLabelText(/password saat ini/i), "lama");
    await user.type(screen.getByLabelText(/^password baru$/i), "password456");
    await user.type(
      screen.getByLabelText(/ulangi password baru/i),
      "password456",
    );
    await user.click(screen.getByRole("button", { name: /ubah password/i }));

    expect(
      (await screen.findAllByText(/password saat ini salah/i)).length,
    ).toBeGreaterThan(0);
  });

  it("lists active sessions and revokes another device", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        account: session,
        hasPassword: true,
        sessions: [
          {
            id: "a".repeat(64),
            device: "Firefox · Linux",
            ip: "103.28.1.2",
            signedIn: "2026-11-10T04:30:00.000Z",
            lastActive: "2026-11-10T04:30:00.000Z",
            current: true,
          },
          {
            id: "b".repeat(64),
            device: "Chrome · Windows",
            ip: null,
            signedIn: "2026-10-13T15:23:00.000Z",
            lastActive: "2026-10-13T15:23:00.000Z",
            current: false,
          },
        ],
      }),
    }) as unknown as typeof fetch;
    const { revokeSessionAction } = jest.requireMock("@/lib/auth/actions");
    revokeSessionAction.mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(
      <ProfileDialog
        session={session}
        section="privasi"
        onOpenChange={jest.fn()}
      />,
    );

    expect(
      (await screen.findAllByText(/firefox · linux/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/chrome · windows/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sesi ini/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ip tidak tercatat/i).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /keluarkan chrome · windows/i }),
    );

    expect(revokeSessionAction).toHaveBeenCalledWith("b".repeat(64));
    await waitFor(() =>
      expect(screen.queryByText(/chrome · windows/i)).toBeNull(),
    );
    expect(
      screen.getByRole("button", { name: /keluar dari semua perangkat/i }),
    ).toBeInTheDocument();
  });

  it("keeps the session and shows an inline error when revocation fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        account: session,
        hasPassword: true,
        sessions: [
          {
            id: "a".repeat(64),
            device: "Firefox · Linux",
            ip: "103.28.1.2",
            signedIn: "2026-11-10T04:30:00.000Z",
            lastActive: "2026-11-10T04:30:00.000Z",
            current: true,
          },
          {
            id: "b".repeat(64),
            device: "Chrome · Windows",
            ip: null,
            signedIn: "2026-10-13T15:23:00.000Z",
            lastActive: "2026-10-13T15:23:00.000Z",
            current: false,
          },
        ],
      }),
    }) as unknown as typeof fetch;
    const { revokeSessionAction } = jest.requireMock("@/lib/auth/actions");
    revokeSessionAction.mockResolvedValue({
      ok: false,
      error: "Sesi itu sudah tidak aktif.",
    });

    const user = userEvent.setup();
    render(
      <ProfileDialog
        session={session}
        section="privasi"
        onOpenChange={jest.fn()}
      />,
    );

    await screen.findAllByText(/chrome · windows/i);
    await user.click(
      screen.getByRole("button", { name: /keluarkan chrome · windows/i }),
    );

    expect(
      (await screen.findAllByText(/sesi itu sudah tidak aktif/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/chrome · windows/i).length).toBeGreaterThan(0);
  });
});

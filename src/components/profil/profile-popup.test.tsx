import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePopup } from "@/components/profil/profile-popup";

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

function mockSession(session: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, session }),
  }) as unknown as typeof fetch;
}

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

describe("ProfilePopup", () => {
  it("renders nothing when there is no session", async () => {
    mockSession(null);
    const { container } = render(<ProfilePopup />);

    await screen.findByRole("button", { name: /akun/i }).catch(() => null);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows identity, progress and saved-job summary in the dashboard menu", async () => {
    mockSession({
      nama: "Siti Rahma",
      email: "siti@lumina.id",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const user = userEvent.setup();
    render(<ProfilePopup />);

    const trigger = await screen.findByRole("button", {
      name: /akun siti rahma/i,
    });
    expect(trigger).toHaveTextContent("SR");

    await user.click(trigger);

    expect(await screen.findByText("siti@lumina.id")).toBeInTheDocument();
    expect(screen.getByText(/kemajuan belajar/i)).toBeInTheDocument();
    expect(screen.getByText("0/12 modul")).toBeInTheDocument();
    expect(screen.getAllByText(/lowongan tersimpan/i).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/belum ada lowongan tersimpan di perangkat ini/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /ganti akun/i }),
    ).toHaveAttribute("href", "/masuk");
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });
});

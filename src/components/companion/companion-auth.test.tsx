import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionAuth } from "@/components/companion/companion-auth";

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/lib/auth/actions", () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
}));

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

describe("CompanionAuth", () => {
  it("offers Masuk and Daftar in the expanded sidebar", () => {
    render(<CompanionAuth session={null} />);

    expect(
      screen.getByRole("button", { name: /^masuk$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^daftar$/i }),
    ).toBeInTheDocument();
  });

  it("opens the dialog from the expanded sidebar", async () => {
    const user = userEvent.setup();
    render(<CompanionAuth session={null} />);

    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName(/masuk ke lumina/i);
  });

  it("collapses to a single labelled login button in the rail", async () => {
    const user = userEvent.setup();
    render(<CompanionAuth session={null} iconsOnly />);

    await user.click(
      screen.getByRole("button", { name: /masuk atau daftar/i }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens the account menu from the signed-in profile row", async () => {
    const user = userEvent.setup();
    render(
      <CompanionAuth session={{ nama: "Siti", email: "siti@lumina.id" }} />,
    );

    expect(screen.getByText("siti@lumina.id")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /akun siti/i }));

    expect(
      await screen.findByRole("menuitem", { name: /profil saya/i }),
    ).toHaveAttribute("href", "/profil");
    expect(
      screen.getByRole("menuitem", { name: /kemajuan belajar/i }),
    ).toHaveAttribute("href", "/profil#kemajuan");
    expect(
      screen.getByRole("menuitem", { name: /lowongan tersimpan/i }),
    ).toHaveAttribute("href", "/profil#loker");
    expect(
      screen.getByRole("menuitem", { name: /privasi & keamanan/i }),
    ).toHaveAttribute("href", "/profil#akun-privasi");
    expect(
      screen.getByRole("menuitem", { name: /panduan anti-penipuan/i }),
    ).toHaveAttribute("href", "/belajar");
    expect(
      screen.getByRole("menuitem", { name: /mode darurat/i }),
    ).toHaveAttribute("href", "/darurat");
    expect(
      screen.getByRole("menuitem", { name: /ganti akun/i }),
    ).toHaveAttribute("href", "/masuk");
    expect(screen.getByText(/sesi aktif/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });

  it("keeps the rail avatar as the same account menu", async () => {
    const user = userEvent.setup();
    render(
      <CompanionAuth
        session={{ nama: "Budi", email: "budi@lumina.id" }}
        iconsOnly
      />,
    );

    const trigger = screen.getByRole("button", { name: /akun budi/i });
    expect(trigger).toHaveTextContent("B");

    await user.click(trigger);

    expect(
      await screen.findByRole("menuitem", { name: /profil saya/i }),
    ).toBeInTheDocument();
  });
});

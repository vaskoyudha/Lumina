import { render, screen } from "@testing-library/react";
import { ProfilView } from "@/components/profil/profil-view";
import { saveProfile } from "@/lib/auth/local-profile";

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

describe("ProfilView", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the session identity and the demo marker", () => {
    render(<ProfilView nama="Siti" email="siti@lumina.id" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Siti" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("siti@lumina.id").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Akun demo")).toBeInTheDocument();
  });

  it("offers a way to switch accounts and to log out", () => {
    render(<ProfilView nama="Siti" email="siti@lumina.id" />);

    expect(
      screen.getByRole("link", { name: /ganti akun demo/i }),
    ).toHaveAttribute("href", "/masuk");
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });

  it("states the demo limits in visible copy", () => {
    render(<ProfilView nama="Siti" email="siti@lumina.id" />);

    expect(screen.getByText(/tidak ada database/i)).toBeInTheDocument();
    expect(screen.getByText(/berlaku 24 jam/i)).toBeInTheDocument();
  });

  it("admits when no local profile record exists", () => {
    render(<ProfilView nama="Budi" email="budi@lumina.id" />);

    expect(
      screen.getByText(/tidak dicatat \(akun demo\)/i),
    ).toBeInTheDocument();
  });

  it("uses the recorded registration date when this device registered", async () => {
    saveProfile({
      email: "baru@contoh.id",
      nama: "Rina",
      createdAt: "2026-11-05T10:00:00.000Z",
    });
    render(<ProfilView nama="Rina" email="baru@contoh.id" />);

    expect(await screen.findByText(/5 November 2026/i)).toBeInTheDocument();
  });

  it("falls back to a question mark for an empty name", () => {
    render(<ProfilView nama="" email="tanpa@nama.id" />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

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

  it("links the signed-in person to their profile", () => {
    render(
      <CompanionAuth session={{ nama: "Siti", email: "siti@lumina.id" }} />,
    );

    const link = screen.getByRole("link", { name: /profil siti/i });
    expect(link).toHaveAttribute("href", "/profil");
    expect(screen.getByText("siti@lumina.id")).toBeInTheDocument();
  });

  it("keeps the rail avatar linked to the profile", () => {
    render(
      <CompanionAuth
        session={{ nama: "Budi", email: "budi@lumina.id" }}
        iconsOnly
      />,
    );

    const link = screen.getByRole("link", { name: /profil budi/i });
    expect(link).toHaveAttribute("href", "/profil");
    expect(link).toHaveTextContent("B");
  });
});

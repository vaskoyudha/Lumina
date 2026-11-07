import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/auth/user-menu";

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

describe("UserMenu", () => {
  it("names the trigger after the signed-in person", () => {
    render(<UserMenu nama="Siti" email="siti@lumina.id" />);

    expect(
      screen.getByRole("button", { name: /akun siti/i }),
    ).toBeInTheDocument();
  });

  it("links to the profile page from the menu", async () => {
    const user = userEvent.setup();
    render(<UserMenu nama="Siti" email="siti@lumina.id" />);

    await user.click(screen.getByRole("button", { name: /akun siti/i }));

    expect(
      await screen.findByRole("menuitem", { name: /^profil$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^profil$/i })).toHaveAttribute(
      "href",
      "/profil",
    );
  });

  it("shows who is signed in and offers logout", async () => {
    const user = userEvent.setup();
    render(<UserMenu nama="Budi" email="budi@lumina.id" />);

    await user.click(screen.getByRole("button", { name: /akun budi/i }));

    expect(await screen.findByText("budi@lumina.id")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });
});

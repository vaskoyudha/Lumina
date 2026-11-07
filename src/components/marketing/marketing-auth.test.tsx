import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketingAuth } from "@/components/marketing/marketing-auth";

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

describe("MarketingAuth", () => {
  it("renders both entries on the dark landing glass", () => {
    render(<MarketingAuth />);

    expect(
      screen.getByRole("button", { name: /^masuk$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^daftar$/i }),
    ).toBeInTheDocument();
  });

  it("opens the frosted login dialog from Masuk", async () => {
    const user = userEvent.setup();
    render(<MarketingAuth />);

    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName(/masuk ke lumina/i);
  });

  it("opens the dialog on the Daftar tab from Daftar", async () => {
    const user = userEvent.setup();
    render(<MarketingAuth />);

    await user.click(screen.getByRole("button", { name: /^daftar$/i }));

    expect(screen.getByLabelText(/^nama$/i)).toBeInTheDocument();
  });

  it("keeps the same entries when the header is scrolled", () => {
    render(<MarketingAuth scrolled />);

    expect(
      screen.getByRole("button", { name: /^masuk$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^daftar$/i }),
    ).toBeInTheDocument();
  });
});

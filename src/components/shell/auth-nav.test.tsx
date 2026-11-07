import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthNav } from "@/components/shell/auth-nav";

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

describe("AuthNav", () => {
  it("shows Masuk and Daftar when nobody is signed in", () => {
    render(<AuthNav session={null} />);

    expect(
      screen.getByRole("button", { name: /^masuk$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^daftar$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the login dialog from Masuk", async () => {
    const user = userEvent.setup();
    render(<AuthNav session={null} />);

    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it("opens the register dialog from Daftar", async () => {
    const user = userEvent.setup();
    render(<AuthNav session={null} />);

    await user.click(screen.getByRole("button", { name: /^daftar$/i }));

    expect(screen.getByLabelText(/^nama$/i)).toBeInTheDocument();
  });

  it("names the account trigger after the signed-in person", () => {
    render(<AuthNav session={{ nama: "Siti", email: "siti@lumina.id" }} />);

    expect(
      screen.getByRole("button", { name: /akun siti/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^masuk$/i }),
    ).not.toBeInTheDocument();
  });
});

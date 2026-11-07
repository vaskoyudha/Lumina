import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthDialog } from "@/components/auth/auth-dialog";

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

describe("AuthDialog", () => {
  it("stays closed until asked to open", () => {
    render(<AuthDialog open={false} onOpenChange={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on the Masuk tab by default", () => {
    render(<AuthDialog open onOpenChange={jest.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/masuk ke lumina/i);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it("opens straight on the Daftar tab when asked", () => {
    render(<AuthDialog open onOpenChange={jest.fn()} defaultTab="daftar" />);

    expect(screen.getByLabelText(/^nama$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /buat akun demo/i }),
    ).toBeInTheDocument();
  });

  it("closes through the labelled close control", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(<AuthDialog open onOpenChange={onOpenChange} />);

    await user.click(
      screen.getByRole("button", { name: /tutup dialog masuk dan daftar/i }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

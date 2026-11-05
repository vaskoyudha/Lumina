import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthPanel } from "@/components/auth/auth-panel";

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

describe("AuthPanel", () => {
  it("renders the login form and the demo accounts", () => {
    render(<AuthPanel />);

    expect(screen.getByRole("tab", { name: /masuk/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /daftar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^masuk$/i }),
    ).toBeInTheDocument();
  });

  it("prints both demo accounts with their credentials", () => {
    render(<AuthPanel />);

    expect(screen.getByText("siti@lumina.id · demo1234")).toBeInTheDocument();
    expect(screen.getByText("budi@lumina.id · demo1234")).toBeInTheDocument();
    expect(screen.getAllByText(/Akun demo/i).length).toBeGreaterThanOrEqual(1);
  });

  it("admits in visible copy that only demo credentials are sent", () => {
    render(<AuthPanel />);

    expect(
      screen.getByText(/hanya kredensial demo yang dikirim/i),
    ).toBeInTheDocument();
  });

  it("fills the form from the one-click demo button", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    const fillButtons = screen.getAllByRole("button", {
      name: /isi otomatis/i,
    });
    await user.click(fillButtons[0] as HTMLElement);

    expect(screen.getByLabelText(/^email$/i)).toHaveValue("siti@lumina.id");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("demo1234");
  });

  it("opens the register tab when asked", () => {
    render(<AuthPanel defaultTab="daftar" />);

    expect(screen.getByLabelText(/^nama$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /buat akun demo/i }),
    ).toBeInTheDocument();
  });
});

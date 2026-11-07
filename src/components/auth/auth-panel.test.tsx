import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthPanel } from "@/components/auth/auth-panel";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock("@/lib/auth/actions", () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

describe("AuthPanel", () => {
  it("offers Google and password login without public demo credentials", () => {
    render(<AuthPanel />);
    expect(
      screen.getByRole("link", { name: /masuk dengan google/i }),
    ).toHaveAttribute("href", "/api/auth/google?intent=masuk");
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.queryByText(/demo1234/)).not.toBeInTheDocument();
  });

  it("opens registration with consent and a Google entrypoint", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);
    await user.click(screen.getByRole("tab", { name: "Daftar" }));
    expect(screen.getByLabelText(/^nama$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /daftar dengan google/i }),
    ).toHaveAttribute("href", "/api/auth/google?intent=daftar");
    expect(screen.getByRole("checkbox")).toBeRequired();
    expect(
      screen.getByRole("button", { name: /buat akun/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Verifikasi email dan pemulihan password belum tersedia/,
      ),
    ).toBeInTheDocument();
  });

  it("renders a standalone register form linked to the login page", () => {
    render(<AuthPanel mode="daftar" />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute(
      "href",
      "/masuk",
    );
    expect(
      screen.getByRole("link", { name: /bantuan darurat/i }),
    ).toHaveAttribute("href", "/darurat");
  });

  it("can show and hide the password", async () => {
    const user = userEvent.setup();
    render(<AuthPanel mode="masuk" />);
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute("type", "password");
    await user.click(
      screen.getByRole("button", { name: "Tampilkan password" }),
    );
    expect(password).toHaveAttribute("type", "text");
  });
});

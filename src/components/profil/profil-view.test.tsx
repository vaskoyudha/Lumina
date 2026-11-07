import { render, screen } from "@testing-library/react";
import { ProfilView } from "@/components/profil/profil-view";

jest.mock("@/lib/auth/actions", () => ({ logout: jest.fn() }));

describe("ProfilView", () => {
  it("shows the server identity, registration date and local progress boundaries", () => {
    render(
      <ProfilView
        nama="Rina"
        email="rina@example.com"
        createdAt="2026-11-07T10:00:00.000Z"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Rina" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Akun Lumina")).toBeInTheDocument();
    expect(screen.getByText("7 November 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/progres belajar tetap di perangkat/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ganti akun/i })).toHaveAttribute(
      "href",
      "/masuk",
    );
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });
});

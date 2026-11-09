import { MODULE_FIXTURES } from "@/lib/content/fixtures";
import { mockAccount } from "@/test/learning";

jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import { ProfilView } from "@/components/profil/profil-view";

jest.mock("@/lib/auth/actions", () => ({ logout: jest.fn() }));

describe("ProfilView", () => {
  it("shows the server identity, registration date and local progress boundaries", () => {
    mockAccount();
    render(
      <ProfilView
        modules={MODULE_FIXTURES}
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
      screen.getByText(
        /progres belajar dan hasil simulasi tersimpan per akun/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ganti akun/i })).toHaveAttribute(
      "href",
      "/masuk",
    );
    expect(screen.getByRole("button", { name: /keluar/i })).toBeInTheDocument();
  });
});

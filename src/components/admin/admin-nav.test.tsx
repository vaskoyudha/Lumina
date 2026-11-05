import { render, screen } from "@testing-library/react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteNav } from "@/components/shell/site-nav";

const pathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

describe("AdminNav", () => {
  beforeEach(() => {
    pathname.mockReturnValue("/admin");
  });

  it("does not offer any learner surface — the admin is its own area", () => {
    render(<AdminNav />);

    expect(
      screen.getByRole("navigation", { name: /navigasi admin/i }),
    ).toBeInTheDocument();

    for (const href of ["/companion", "/belajar", "/simulasi", "/darurat"]) {
      expect(
        screen.queryByRole("link", { name: new RegExp(href.slice(1), "i") }),
      ).not.toBeInTheDocument();
    }
  });

  it("keeps one explicit way back to the learner app", () => {
    render(<AdminNav />);
    expect(
      screen.getByRole("link", { name: /lihat aplikasi murid/i }),
    ).toHaveAttribute("href", "/");
  });

  it("matches the learner nav chrome: same container, pill row and right-hand action", () => {
    const { container: admin } = render(<AdminNav />);
    const { container: user } = render(<SiteNav />);

    for (const root of [admin, user]) {
      const header = root.querySelector("header");
      expect(header?.className).toContain("border-b border-line bg-white");
      const row = header?.querySelector("div");
      expect(row?.className).toContain("max-w-6xl");
    }
  });
});

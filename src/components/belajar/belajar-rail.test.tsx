import { render, screen } from "@testing-library/react";
import { BelajarRail } from "@/components/belajar/belajar-rail";

const pathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

/**
 * The rail replaces the dashboard's seven-icon chrome with three destinations
 * that exist. The test keeps that promise: no decorative link, and only the
 * real current page is announced as current.
 */

describe("BelajarRail", () => {
  beforeEach(() => {
    pathname.mockReturnValue("/belajar");
  });

  it("offers exactly the three real destinations", () => {
    render(<BelajarRail />);

    const nav = screen.getByRole("navigation", { name: /navigasi belajar/i });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);

    expect(screen.getByRole("link", { name: "Katalog" })).toHaveAttribute(
      "href",
      "/belajar",
    );
    expect(screen.getByRole("link", { name: "Latihan" })).toHaveAttribute(
      "href",
      "/simulasi",
    );
    expect(screen.getByRole("link", { name: "Lencana" })).toHaveAttribute(
      "href",
      "/belajar#lencana",
    );
    expect(nav).toContainElement(screen.getByRole("link", { name: "Katalog" }));
  });

  it("marks the catalog current on a module page too", () => {
    pathname.mockReturnValue("/belajar/10");
    render(<BelajarRail />);

    expect(screen.getByRole("link", { name: "Katalog" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Latihan" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not mark the anchored badge link as a page", () => {
    pathname.mockReturnValue("/belajar");
    render(<BelajarRail />);

    expect(screen.getByRole("link", { name: "Lencana" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

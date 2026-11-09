jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type KatalogItem,
  ModulKatalog,
} from "@/components/belajar/modul-katalog";

/**
 * The catalog is the one interactive surface on `/belajar`. These tests pin the
 * behaviour a demo actually depends on: filtering narrows the list honestly,
 * says how many rows are left, and a dead filter is always reversible.
 */

const ITEMS: KatalogItem[] = [
  {
    no: 10,
    nama: "File APK via WhatsApp",
    ciri: ["APK kiriman", "izin berlebihan"],
    laporanLabel: "12.345 laporan",
    kerugian: "Rp1,2 miliar",
    level: 1,
    ready: true,
  },
  {
    no: 1,
    nama: "Jual-beli online palsu",
    ciri: ["transfer langsung", "toko fiktif"],
    laporanLabel: "48.000 laporan",
    kerugian: "Rp9,8 miliar",
    level: 3,
    ready: false,
  },
  {
    no: 3,
    nama: "Investasi bodong & kripto",
    ciri: ["imbal hasil tetap", "referral"],
    laporanLabel: "31.000 laporan",
    kerugian: "Rp120 miliar",
    level: 3,
    ready: false,
  },
];

describe("ModulKatalog", () => {
  it("lists every module and links even the unwritten ones", () => {
    render(<ModulKatalog items={ITEMS} />);

    expect(screen.getByText("3 dari 3 modul ditampilkan")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /jual-beli online palsu/i }),
    ).toHaveAttribute("href", "/belajar/1");
  });

  it("keeps the illustration clean and labels it at the top", () => {
    render(<ModulKatalog items={ITEMS} />);

    const card = screen.getByRole("link", { name: /jual-beli online palsu/i });
    expect(card.querySelector("img")?.getAttribute("src")).toMatch(/modul-01/);
    expect(within(card).getByText("Modus 01")).toBeInTheDocument();
    expect(within(card).queryByText("Segera")).not.toBeInTheDocument();
  });

  it("filters by search text and reports the new count", async () => {
    const user = userEvent.setup();
    render(<ModulKatalog items={ITEMS} />);

    await user.type(
      screen.getByRole("searchbox", { name: /cari modul/i }),
      "apk",
    );

    expect(screen.getByText("1 dari 3 modul ditampilkan")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /file apk via whatsapp/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /investasi bodong/i }),
    ).not.toBeInTheDocument();
  });

  it("filters by level through the pill group", async () => {
    const user = userEvent.setup();
    render(<ModulKatalog items={ITEMS} />);

    const group = screen.getByRole("group", { name: /saring menurut level/i });
    await user.click(within(group).getByRole("button", { name: "Level 3" }));

    expect(
      within(group).getByRole("button", { name: "Level 3" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2 dari 3 modul ditampilkan")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /file apk via whatsapp/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an honest empty state and backs out of it", async () => {
    const user = userEvent.setup();
    render(<ModulKatalog items={ITEMS} />);

    await user.type(
      screen.getByRole("searchbox", { name: /cari modul/i }),
      "tidak-ada",
    );

    expect(
      screen.getByText(/tidak ada modul yang cocok dengan saringan ini/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /atur ulang saringan/i }),
    );

    expect(screen.getByText("3 dari 3 modul ditampilkan")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /cari modul/i })).toHaveValue(
      "",
    );
  });
});

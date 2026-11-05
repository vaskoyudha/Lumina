import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminInventory } from "@/components/admin/admin-inventory";
import { PUBLISHED_COUNT } from "@/data/kurikulum";
import { MODUL_10 } from "@/data/modul-10";
import { blankDraft, loadDrafts, upsertDraft } from "@/lib/admin/draft-store";
import { MODUS } from "@/lib/modus";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
}));

/** A draft that passes the same validation as export. */
function ready(no: number) {
  const base = blankDraft(no, {
    nama: "Tautan palsu",
    level: 2,
    ciri: ["Tautan aneh"],
    laporan: 10,
    kerugian: "±Rp1 M",
  });
  return { ...base, content: { ...MODUL_10, no } };
}

describe("AdminInventory", () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
  });

  it("shows the catalog honestly: published vs empty", async () => {
    render(<AdminInventory />);
    expect(
      await screen.findByText(new RegExp(`${PUBLISHED_COUNT} terbit`)),
    ).toBeInTheDocument();
    // Every course with content in KURIKULUM shows Terbit.
    expect(screen.getAllByText("Terbit")).toHaveLength(PUBLISHED_COUNT);
    expect(screen.getAllByText("Kosong").length).toBeGreaterThan(0);
  });

  it("marks a course with a stored draft as Draf", async () => {
    upsertDraft(blankDraft(3, { nama: "Lowongan kerja palsu" }));
    render(<AdminInventory />);
    expect(
      await screen.findByText(/1 draf di perangkat ini/),
    ).toBeInTheDocument();
    expect(screen.getByText("Draf")).toBeInTheDocument();
  });

  it("creates a new course draft after asking for its name", async () => {
    const user = userEvent.setup();
    render(<AdminInventory />);
    await screen.findByText(new RegExp(`${PUBLISHED_COUNT} terbit`));

    await user.click(screen.getByRole("button", { name: /course baru/i }));
    await user.type(screen.getByLabelText(/nama course baru/i), "Undian palsu");
    await user.click(screen.getByRole("button", { name: /buat draf/i }));

    // The catalog can grow past 12, so the expected number is the first free one.
    const taken = new Set(MODUS.map((m) => m.no));
    let expected = 1;
    while (taken.has(expected)) expected += 1;

    const drafts = loadDrafts().courses;
    expect(drafts.map((c) => c.no)).toEqual([expected]);
    expect(drafts[0]?.meta.nama).toBe("Undian palsu");
    expect(push).toHaveBeenCalledWith(`/admin/${expected}`);
  });

  it("offers the publish shortcut only for a draft that passes validation", async () => {
    upsertDraft(ready(14));
    render(<AdminInventory />);

    const terbit = await screen.findByRole("link", { name: /terbitkan/i });
    expect(terbit).toHaveAttribute("href", "/admin/14#terbit");
  });

  it("does not offer publish for an incomplete draft", async () => {
    upsertDraft(blankDraft(13, { nama: "Belum jadi" }));
    render(<AdminInventory />);

    await screen.findByText(/1 draf di perangkat ini/);
    expect(
      screen.queryByRole("link", { name: /terbitkan/i }),
    ).not.toBeInTheDocument();
  });
});

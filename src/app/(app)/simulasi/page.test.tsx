import { render, screen, within } from "@testing-library/react";
import SimulasiPage from "@/app/(app)/simulasi/page";

describe("halaman misi simulasi", () => {
  it("menampilkan cerita fiktif, tiga babak, tiga akhir, dan jalur L1 yang hidup", () => {
    render(<SimulasiPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Paket sebelum pulang" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/besok ulang tahun ibu/i)).toBeInTheDocument();
    expect(screen.getByText(/perkiraan 3–5 menit/i)).toBeInTheDocument();
    expect(screen.getByText(/FOTO_PAKET\.apk/)).toBeInTheDocument();
    expect(screen.getByText(/3 kemungkinan akhir/i)).toBeInTheDocument();

    const chapters = screen.getByRole("region", { name: "Alur misi" });
    expect(within(chapters).getAllByRole("listitem")).toHaveLength(3);

    expect(screen.getByRole("link", { name: "Mulai misi" })).toHaveAttribute(
      "href",
      "/simulasi/L1-kurir-apk",
    );
    const planned = screen.getByRole("region", { name: "Level lain" });
    expect(within(planned).getAllByText("Rencana")).toHaveLength(4);
    expect(within(planned).queryByRole("link")).not.toBeInTheDocument();
  });
});

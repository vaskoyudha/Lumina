import { render, screen, within } from "@testing-library/react";
import SimulasiPage from "@/app/simulasi/page";

describe("halaman daftar simulasi", () => {
  it("membuka skenario APK dan menampilkan level rencana tanpa tautan mati", () => {
    render(<SimulasiPage />);

    expect(screen.getByRole("link", { name: "Mulai latihan" })).toHaveAttribute(
      "href",
      "/simulasi/L1-kurir-apk",
    );
    expect(
      screen.getByRole("link", { name: "Pelajari pola APK" }),
    ).toHaveAttribute("href", "/belajar/10");
    expect(
      screen.getByRole("link", { name: "Butuh bantuan sekarang?" }),
    ).toHaveAttribute("href", "/darurat");

    const planned = screen.getByRole("region", { name: "Dalam rencana" });
    expect(within(planned).getAllByText("Rencana")).toHaveLength(4);
    expect(within(planned).queryByRole("link")).not.toBeInTheDocument();
  });
});

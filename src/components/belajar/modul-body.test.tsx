import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModulBody } from "@/components/belajar/modul-body";
import { MODUL_10 } from "@/data/modul-10";
import { STORAGE_KEY } from "@/lib/progress";

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

describe("ModulBody — modul 10", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the full agreed structure", () => {
    render(<ModulBody modul={MODUL_10} />);

    for (const step of MODUL_10.anatomi) {
      expect(
        screen.getByRole("heading", { name: new RegExp(step.judul, "i") }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText(/bukti-pengiriman\.apk/i)).toBeInTheDocument();
    for (const item of MODUL_10.checklist) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText(/uji pemahamanmu/i)).toBeInTheDocument();
    for (const step of MODUL_10.lapor) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("link", { name: /latih pola ini di simulasi/i }),
    ).toHaveAttribute("href", "/simulasi/L1-kurir-apk");
  });

  it("does not claim completion before the quiz is passed", () => {
    render(<ModulBody modul={MODUL_10} />);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.queryByText(/badge penjaga apk/i)).not.toBeInTheDocument();
  });

  it("writes progress and shows the badge after the quiz is passed", async () => {
    const user = userEvent.setup();
    render(<ModulBody modul={MODUL_10} />);

    // Q1–Q4, all correct (advance is automatic on a correct pick).
    await user.click(
      screen.getByRole("button", { name: /hapus tanpa instal/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /cek resi lewat aplikasi resmi/i }),
    );
    await user.click(screen.getByRole("button", { name: /telepon kakakmu/i }));
    await user.click(
      screen.getByRole("button", { name: /matikan data\/wi-fi/i }),
    );

    expect(screen.getByText(/4 benar dari 4 soal/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /tandai modul selesai/i }),
    );
    expect(await screen.findByText(/penjaga apk/i)).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.completedModules).toContain(10);
    expect(stored.badges).toContain("penjaga-apk");
  });
});

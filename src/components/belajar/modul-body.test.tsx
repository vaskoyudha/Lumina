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

    // Q1–Q4, all correct. A correct pick locks the question; advance is explicit.
    await user.click(
      screen.getByRole("button", { name: /hapus tanpa instal/i }),
    );
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(
      screen.getByRole("button", { name: /cek resi lewat aplikasi resmi/i }),
    );
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(screen.getByRole("button", { name: /telepon kakakmu/i }));
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
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

  it("records the patterns missed in the quiz instead of discarding them", async () => {
    const user = userEvent.setup();
    render(<ModulBody modul={MODUL_10} />);

    // Q1 wrong, Q2–Q4 right: 3/4 still passes the 60% bar.
    await user.click(
      screen.getByRole("button", { name: /instal dan buka undangannya/i }),
    );
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(
      screen.getByRole("button", { name: /cek resi lewat aplikasi resmi/i }),
    );
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(screen.getByRole("button", { name: /telepon kakakmu/i }));
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(
      screen.getByRole("button", { name: /matikan data\/wi-fi/i }),
    );

    expect(screen.getByText(/3 benar dari 4 soal/i)).toBeInTheDocument();
    expect(screen.getByText(/tinjau yang kamu lewatkan/i)).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.missedPatterns).toContain("apk-q1");
  });
});

describe("ModulBody — bingkai contoh", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads the source line from the course data instead of a hardcoded chat line", () => {
    render(<ModulBody modul={MODUL_10} />);

    expect(
      screen.getByText("Nomor tak dikenal · WhatsApp · baru saja"),
    ).toBeInTheDocument();
    expect(screen.getByText("+62")).toBeInTheDocument();
  });

  it("frames a link example as a link, not as a message", () => {
    render(
      <ModulBody
        modul={{
          ...MODUL_10,
          contohJenis: "tautan",
          contohSumber: "Tautan dari link",
        }}
      />,
    );

    expect(screen.getByText("Tautan dari link")).toBeInTheDocument();
    expect(screen.getByText(/jangan ketuk tautannya/i)).toBeInTheDocument();
    // Chat chrome belongs to the message shape only.
    expect(screen.queryByText("+62")).not.toBeInTheDocument();
    expect(screen.queryByText(/jangan dibalas/i)).not.toBeInTheDocument();
    // The sidebar entry follows the declared shape.
    expect(
      screen.getByRole("link", { name: /contoh tautan asli/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /contoh pesan asli/i }),
    ).not.toBeInTheDocument();
  });

  it("frames a fake-site example as a browser window showing its address", () => {
    render(
      <ModulBody
        modul={{
          ...MODUL_10,
          contohJenis: "situs",
          contohSumber: "https://pengiriman-palsu.example",
        }}
      />,
    );

    expect(
      screen.getByText("https://pengiriman-palsu.example"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contoh situs asli/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("+62")).not.toBeInTheDocument();
    expect(screen.queryByText(/jangan dibalas/i)).not.toBeInTheDocument();
  });

  it("frames a call example with advice shaped to a phone call", () => {
    render(
      <ModulBody
        modul={{
          ...MODUL_10,
          contohJenis: "panggilan",
          contohSumber: "Telepon masuk · nomor tak dikenal",
        }}
      />,
    );

    expect(
      screen.getByText("Telepon masuk · nomor tak dikenal"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tutup, lalu telepon nomor resmi/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contoh panggilan asli/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/jangan dibalas/i)).not.toBeInTheDocument();
  });
});

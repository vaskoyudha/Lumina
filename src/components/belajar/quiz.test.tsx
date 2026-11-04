import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Quiz, type QuizQuestion } from "@/components/belajar/quiz";

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

const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Nomor asing kirim Undangan-Pernikahan.apk. Apa yang kamu lakukan sekarang?",
    options: [
      { id: "a", label: "Buka, mungkin dari kerabat" },
      { id: "b", label: "Instal dan buka undangan" },
      { id: "c", label: "Hapus, jangan instal aplikasi di luar Play Store" },
    ],
    correctId: "c",
    rationale:
      "File .apk di luar Play Store bisa mencuri SMS OTP dan data m-banking begitu izin SMS diberikan.",
  },
  {
    id: "q2",
    prompt: "Sudah terlanjur instal APK itu. Apa yang kamu lakukan sekarang?",
    options: [
      { id: "a", label: "Diamkan, mungkin tidak terjadi apa-apa" },
      { id: "b", label: "Matikan data, hapus aplikasi, cek mutasi, hubungi bank" },
      { id: "c", label: "Terus pakai HP seperti biasa" },
    ],
    correctId: "b",
    rationale:
      "Matikan data dulu supaya malware tidak bisa mengirim data keluar, lalu periksa rekening lewat kanal resmi.",
  },
  {
    id: "q3",
    prompt: "Teman mengirim APK juga. Apa yang kamu lakukan sekarang?",
    options: [
      { id: "a", label: "Konfirmasi lewat telepon atau kanal lain dulu" },
      { id: "b", label: "Langsung instal, ini dari teman" },
      { id: "c", label: "Teruskan ke grup keluarga" },
    ],
    correctId: "a",
    rationale:
      "Nomor teman bisa dibajak. Konfirmasi lewat kanal yang berbeda sebelum percaya pada file apa pun.",
  },
];

describe("Quiz", () => {
  it("starts on the first question without claiming a score", () => {
    render(<Quiz questions={QUESTIONS} onDone={jest.fn()} />);
    expect(
      screen.getByRole("heading", { name: /nomor asing kirim/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/soal 1 dari 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/benar dari/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/selesai/i)).not.toBeInTheDocument();
  });

  it("shows the rationale immediately on a wrong answer and does not advance", async () => {
    const user = userEvent.setup();
    render(<Quiz questions={QUESTIONS} onDone={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /instal dan buka/i }));

    expect(screen.getByText(/di luar play store bisa mencuri/i)).toBeInTheDocument();
    expect(screen.getByText(/soal 1 dari 3/i)).toBeInTheDocument();
    // Answer is locked: clicking another option changes nothing.
    await user.click(
      screen.getByRole("button", { name: /hapus, jangan instal/i }),
    );
    expect(screen.getByText(/di luar play store bisa mencuri/i)).toBeInTheDocument();
  });

  it("advances after a correct answer and reports the score in the summary", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    render(<Quiz questions={QUESTIONS} onDone={onDone} />);

    await user.click(
      screen.getByRole("button", { name: /hapus, jangan instal/i }),
    );
    // A correct answer advances immediately — no extra click.
    expect(
      screen.getByRole("heading", { name: /sudah terlanjur instal/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /matikan data, hapus aplikasi/i }),
    );
    expect(
      screen.getByRole("heading", { name: /teman mengirim apk/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /konfirmasi lewat telepon/i }),
    );
    expect(screen.getByText(/3 benar dari 3 soal/i)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith(3, 3, []);
  });

  it("calls onDone with missed patterns when answers were wrong", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    render(<Quiz questions={QUESTIONS} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: /instal dan buka/i }));
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    expect(
      screen.getByRole("heading", { name: /sudah terlanjur instal/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /matikan data, hapus aplikasi/i }),
    );
    expect(
      screen.getByRole("heading", { name: /teman mengirim apk/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /konfirmasi lewat telepon/i }),
    );
    expect(onDone).toHaveBeenCalledWith(2, 3, ["q1"]);
  });

  it("does not let a score below 60% finish the module", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    render(<Quiz questions={QUESTIONS} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: /instal dan buka/i }));
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(screen.getByRole("button", { name: /terus pakai hp/i }));
    await user.click(screen.getByRole("button", { name: /soal berikutnya/i }));
    await user.click(
      screen.getByRole("button", { name: /langsung instal, ini dari teman/i }),
    );

    expect(onDone).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /coba lagi/i }),
    ).toBeInTheDocument();
  });
});

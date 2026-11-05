import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizEditor } from "@/components/admin/quiz-editor";
import type { QuizQuestion } from "@/data/modul-schema";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

function questions(): QuizQuestion[] {
  return [
    {
      id: "q1",
      prompt: "Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Instal file" },
        { id: "b", label: "Hapus file" },
      ],
      correctId: "b",
      rationale: "File APK dari chat tidak pernah aman.",
    },
    {
      id: "q2",
      prompt: "Apa yang kamu lakukan berikutnya?",
      options: [
        { id: "a", label: "Kirim OTP" },
        { id: "b", label: "Blokir nomor" },
      ],
      correctId: "a",
      rationale: "OTP tidak pernah diminta lewat chat.",
    },
    {
      id: "q3",
      prompt: "Apa yang kamu lakukan terakhir?",
      options: [
        { id: "a", label: "Lapor IASC" },
        { id: "b", label: "Diam" },
      ],
      correctId: "a",
      rationale: "Laporan membuat pola ini terlihat oleh yang lain.",
    },
  ];
}

describe("QuizEditor", () => {
  it("clears the answer instead of retargeting it when the correct option is deleted", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const three = questions();
    three[0] = {
      ...three[0],
      options: [
        { id: "a", label: "Instal file" },
        { id: "b", label: "Hapus file" },
        { id: "c", label: "Teruskan ke teman" },
      ],
      correctId: "b",
    };
    render(<QuizEditor items={three} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: /hapus opsi b soal 1/i }),
    );

    const removed = onChange.mock.calls[0]?.[0] as QuizQuestion[];
    expect(removed[0]?.correctId).toBe("");
    expect(removed[0]?.options).toHaveLength(2);
    expect(removed[0]?.options.map((o) => o.label)).toEqual([
      "Instal file",
      "Teruskan ke teman",
    ]);
  });

  it("marks a question with no answer and blocks it visually", () => {
    const broken = questions();
    broken[0] = { ...broken[0], correctId: "" };
    render(<QuizEditor items={broken} onChange={jest.fn()} />);
    expect(screen.getAllByText(/belum ada jawaban benar/i).length).toBe(1);
  });

  it("keeps the answer attached to its label when options are relabelled", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const three = questions();
    three[0] = {
      ...three[0],
      options: [
        { id: "a", label: "Satu" },
        { id: "b", label: "Dua" },
        { id: "c", label: "Tiga" },
      ],
      correctId: "c",
    };
    render(<QuizEditor items={three} onChange={onChange} />);

    // Only the first question is on screen under test; its options are the
    // first list items in document order.
    await user.click(
      screen.getByRole("button", { name: /hapus opsi a soal 1/i }),
    );

    const next = onChange.mock.calls[0]?.[0] as QuizQuestion[];
    expect(next[0]?.options.map((o) => o.id)).toEqual(["a", "b"]);
    expect(next[0]?.options.map((o) => o.label)).toEqual(["Dua", "Tiga"]);
    // The answer followed the label "Tiga", which is now option "b".
    const answer = next[0]?.options.find((o) => o.id === next[0]?.correctId);
    expect(answer?.label).toBe("Tiga");
  });
});

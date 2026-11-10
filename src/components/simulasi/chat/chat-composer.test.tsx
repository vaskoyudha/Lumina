import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  ChatComposer,
  ChatQuickReplies,
  ChatTyping,
} from "@/components/simulasi/chat/chat-composer";
import type { ScenarioChoice } from "@/lib/simulasi/types";

const choices: ScenarioChoice[] = [
  { label: "Cek pesanan sendiri", verdict: "benar", next: "a" },
  { label: "Pasang berkas", verdict: "salah", next: "b" },
];

describe("ChatQuickReplies", () => {
  it("renders each choice as a sendable reply and reports the pick", () => {
    const onChoose = jest.fn();
    const promptRef = createRef<HTMLHeadingElement>();
    render(
      <ChatQuickReplies
        prompt="Apa balasanmu?"
        promptRef={promptRef}
        choices={choices}
        disabled={false}
        onChoose={onChoose}
      />,
    );

    expect(screen.getByText("Apa balasanmu?")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /cek pesanan sendiri/i }),
    );
    expect(onChoose).toHaveBeenCalledWith(choices[0]);
  });

  it("disables the pills while paused", () => {
    const promptRef = createRef<HTMLHeadingElement>();
    render(
      <ChatQuickReplies
        prompt="Apa balasanmu?"
        promptRef={promptRef}
        choices={choices}
        disabled
        onChoose={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /pasang berkas/i }),
    ).toBeDisabled();
  });
});

describe("ChatComposer", () => {
  it("renders a disabled WhatsApp-style composer", () => {
    render(<ChatComposer hint="Pilih balasan di atas" />);
    expect(screen.getByPlaceholderText("Pilih balasan di atas")).toBeDisabled();
    expect(screen.getByRole("button", { name: /kirim/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /emoji/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /lampirkan berkas/i }),
    ).toBeDisabled();
  });
});

describe("ChatTyping", () => {
  it("renders an accessible typing bubble", () => {
    render(<ChatTyping />);
    expect(
      screen.getByLabelText(/pengirim sedang mengetik/i),
    ).toBeInTheDocument();
  });
});

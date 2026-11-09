import { render, screen } from "@testing-library/react";
import { ChatBubble, ChatSystem } from "@/components/simulasi/chat/chat-bubble";
import { messageClock } from "@/lib/simulasi/clock";

describe("ChatBubble", () => {
  it("renders an incoming bubble with sender-side styling and time", () => {
    render(
      <ChatBubble
        direction="incoming"
        text="Sore, Kak Raka."
        time={messageClock(0)}
      />,
    );

    expect(screen.getByText("Sore, Kak Raka.")).toBeInTheDocument();
    expect(screen.getByText("16.42")).toBeInTheDocument();
    expect(
      document.querySelector('[data-direction="incoming"]'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("wa-ticks")).not.toBeInTheDocument();
  });

  it("renders an outgoing bubble with orange-side styling and ticks", () => {
    render(
      <ChatBubble
        direction="outgoing"
        text="Cek pesanan lewat aplikasi."
        time={messageClock(2)}
        ticks
      />,
    );

    expect(screen.getByTestId("wa-ticks")).toBeInTheDocument();
    expect(
      document.querySelector('[data-direction="outgoing"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("16.44")).toBeInTheDocument();
  });

  it("renders an attachment card and its action inside the bubble", () => {
    render(
      <ChatBubble
        direction="incoming"
        text="Ini foto paketnya."
        time="16.43"
        attachment={{
          name: "FOTO_PAKET.apk",
          detail: "Aplikasi Android · 4,2 MB · contoh fiktif",
          action: <button type="button">Periksa lampiran</button>,
        }}
      />,
    );

    expect(screen.getByText("FOTO_PAKET.apk")).toBeInTheDocument();
    expect(screen.getByText(/4,2 MB/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /periksa lampiran/i }),
    ).toBeInTheDocument();
  });
});

describe("ChatSystem", () => {
  it("renders a centered system note with a time", () => {
    render(<ChatSystem text="Perangkat latihan: akses terbuka" time="16.45" />);
    expect(screen.getByRole("note")).toHaveTextContent("Perangkat latihan");
    expect(screen.getByText("16.45")).toBeInTheDocument();
  });
});

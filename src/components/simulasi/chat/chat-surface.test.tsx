import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ChatSurface } from "@/components/simulasi/chat/chat-surface";

describe("ChatSurface", () => {
  it("renders the chat header, verification notice and transcript log", () => {
    const bodyRef = createRef<HTMLDivElement>();
    render(
      <ChatSurface
        contactName="Dimas · Pengantaran"
        status="online"
        notice="Nomor tidak tersimpan · identitas belum terverifikasi"
        bodyRef={bodyRef}
        footer={<div>composer</div>}
      >
        <p>Halo</p>
      </ChatSurface>,
    );

    expect(screen.getByText("Dimas · Pengantaran")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
    expect(screen.getByText(/nomor tidak tersimpan/i)).toBeInTheDocument();
    expect(
      screen.getByRole("log", { name: /percakapan latihan/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Halo")).toBeInTheDocument();
    expect(screen.getByText("composer")).toBeInTheDocument();
  });

  it("announces typing in the header status", () => {
    const bodyRef = createRef<HTMLDivElement>();
    render(
      <ChatSurface contactName="Dimas" status="mengetik…" bodyRef={bodyRef}>
        <p>test</p>
      </ChatSurface>,
    );
    expect(screen.getByText("mengetik…")).toBeInTheDocument();
  });
});

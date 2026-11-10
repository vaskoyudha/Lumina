import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DetectionText,
  HighlightExplanation,
} from "@/components/companion/highlight-text";
import type { HighlightDetail } from "@/lib/companion/highlights";

const agentDetail: HighlightDetail = {
  quote: "kode OTP",
  title: "Pesan meminta kode OTP.",
  reason: "Bank tidak meminta OTP lewat chat.",
  pattern: "credential-request",
  watchout: "Jangan kirim kode OTP.",
  source: "agent",
  agent: "Mochi · Message Agent",
};

describe("DetectionText", () => {
  it("renders the quote as a labelled agent highlight", () => {
    render(
      <DetectionText
        text="Kirim kode OTP sekarang."
        highlights={[agentDetail]}
      />,
    );

    const control = screen.getByRole("button", {
      name: /temuan: pesan meminta kode otp/i,
    });
    expect(control).toHaveTextContent("kode OTP");
    expect(control).toHaveAttribute("data-highlight-source", "agent");
    expect(control).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the selected quote to the caller", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <DetectionText
        text="Kirim kode OTP sekarang."
        highlights={[agentDetail]}
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /temuan: pesan meminta kode otp/i }),
    );
    expect(onSelect).toHaveBeenCalledWith("kode OTP");
  });
});

describe("HighlightExplanation", () => {
  it("teaches why the quote matters and what to watch for", () => {
    render(<HighlightExplanation details={[agentDetail]} quote="kode OTP" />);

    expect(screen.getByText("Penjelasan sorotan")).toBeInTheDocument();
    expect(screen.getByText("Pesan meminta kode OTP.")).toBeInTheDocument();
    expect(
      screen.getByText("Bank tidak meminta OTP lewat chat."),
    ).toBeInTheDocument();
    expect(screen.getByText("credential-request")).toBeInTheDocument();
    expect(
      screen.getByText(/jangan kirim kode otp/i, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mochi · message agent/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EvidenceText,
  evidenceSegments,
} from "@/components/companion/evidence-text";
import type { Signal } from "@/lib/contracts/score";

const signal = (over: Partial<Signal>): Signal => ({
  label: "Pola uji",
  weight: 0.5,
  evidence: "transfer",
  agent: "message",
  ...over,
});

describe("evidenceSegments", () => {
  it("returns one plain segment when there are no matching signals", () => {
    expect(evidenceSegments("Halo, apa kabar?", [])).toEqual([
      { text: "Halo, apa kabar?", evidence: null, labels: [] },
    ]);
  });

  it("isolates the exact quote and preserves the text around it", () => {
    const segments = evidenceSegments("Mohon transfer sekarang.", [
      signal({ evidence: "transfer" }),
    ]);

    expect(segments.map((segment) => segment.text).join("")).toBe(
      "Mohon transfer sekarang.",
    );
    expect(segments).toEqual([
      { text: "Mohon ", evidence: null, labels: [] },
      { text: "transfer", evidence: "transfer", labels: ["Pola uji"] },
      { text: " sekarang.", evidence: null, labels: [] },
    ]);
  });

  it("matches case-insensitively but keeps the original casing", () => {
    const segments = evidenceSegments("Mohon TRANSFER sekarang.", [
      signal({ evidence: "transfer" }),
    ]);

    expect(segments.some((segment) => segment.text === "TRANSFER")).toBe(true);
  });

  it("ignores the zero-weight placeholder", () => {
    const segments = evidenceSegments("Halo, apa kabar?", [
      signal({
        label: "Tidak ada pola penipuan yang dikenali pada teks ini",
        weight: 0,
        evidence: "Halo",
      }),
    ]);

    expect(segments).toEqual([
      { text: "Halo, apa kabar?", evidence: null, labels: [] },
    ]);
  });

  it("keeps overlapping quotes from duplicating or dropping text", () => {
    const text = "akun diblokir dalam 2 jam";
    const segments = evidenceSegments(text, [
      signal({ weight: 0.7, evidence: "akun diblokir" }),
      signal({ weight: 0.9, evidence: "diblokir dalam 2 jam" }),
    ]);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segments.filter((segment) => segment.evidence)).toHaveLength(1);
  });

  it("highlights every occurrence of a repeated quote", () => {
    const text = "transfer lalu transfer lagi";
    const segments = evidenceSegments(text, [signal({ evidence: "transfer" })]);

    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(
      segments.filter((segment) => segment.evidence === "transfer"),
    ).toHaveLength(2);
  });
});

describe("EvidenceText", () => {
  it("renders a labelled control for each quote", () => {
    render(
      <EvidenceText
        text="Mohon transfer sekarang."
        signals={[signal({ evidence: "transfer" })]}
      />,
    );

    const control = screen.getByRole("button", { name: /temuan: pola uji/i });
    expect(control).toHaveTextContent("transfer");
    expect(control).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelect with the quote when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <EvidenceText
        text="Mohon transfer sekarang."
        signals={[signal({ evidence: "transfer" })]}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /temuan: pola uji/i }));
    expect(onSelect).toHaveBeenCalledWith("transfer");
  });

  it("exposes the active state", () => {
    render(
      <EvidenceText
        text="Mohon transfer sekarang."
        signals={[signal({ evidence: "transfer" })]}
        activeEvidence="transfer"
      />,
    );

    expect(
      screen.getByRole("button", { name: /temuan: pola uji/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("supports keyboard selection", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(
      <EvidenceText
        text="Mohon transfer sekarang."
        signals={[signal({ evidence: "transfer" })]}
        onSelect={onSelect}
      />,
    );

    const control = screen.getByRole("button", { name: /temuan: pola uji/i });
    control.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("transfer");
  });

  it("leaves unmatched text as a single plain string", () => {
    const { container } = render(
      <EvidenceText
        text="Halo, apa kabar?"
        signals={[signal({ evidence: "transfer" })]}
      />,
    );

    expect(container).toHaveTextContent("Halo, apa kabar?");
    expect(container.querySelector("button")).toBeNull();
  });
});

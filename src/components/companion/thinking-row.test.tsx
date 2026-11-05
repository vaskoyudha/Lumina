import { render, screen } from "@testing-library/react";
import { ThinkingRow } from "@/components/companion/thinking-row";

describe("ThinkingRow", () => {
  it("names what is happening and how long it has taken", () => {
    render(<ThinkingRow label="Menyusun jawaban" startedAt={Date.now()} />);
    expect(screen.getByText("Menyusun jawaban")).toBeInTheDocument();
    expect(screen.getByText(/detik/)).toBeInTheDocument();
  });

  it("renders nothing when the model is not running", () => {
    const { container } = render(
      <ThinkingRow label="Menyusun jawaban" startedAt={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

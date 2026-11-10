import { render, screen } from "@testing-library/react";
import { CompanionMarkdown } from "@/components/companion/companion-markdown";

describe("CompanionMarkdown", () => {
  it("renders model markdown instead of raw asterisks", () => {
    render(
      <CompanionMarkdown
        content={"**Mendesak** dan *mencurigakan*\n\n- OTP\n- Rekening baru"}
      />,
    );

    expect(screen.getByText("Mendesak").tagName).toBe("STRONG");
    expect(screen.getByText("mencurigakan").tagName).toBe("EM");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("renders GFM tables and task lists", () => {
    render(
      <CompanionMarkdown
        content={
          "| Tanda | Arti |\n| --- | --- |\n| OTP | Rahasia |\n\n- [x] Dicek\n- [ ] Diabaikan"
        }
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Rahasia")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("keeps unsafe links inert but renders safe links", () => {
    render(
      <CompanionMarkdown
        content={"[aman](https://example.com) [jahat](javascript:alert(1))"}
      />,
    );

    const safe = screen.getByRole("link", { name: "aman" });
    expect(safe).toHaveAttribute("href", "https://example.com");
    expect(safe).toHaveAttribute("target", "_blank");
    expect(
      screen.queryByRole("link", { name: "jahat" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("jahat")).toBeInTheDocument();
  });

  it("does not execute raw HTML from model output", () => {
    const { container } = render(
      <CompanionMarkdown content={'<script>alert("x")</script><b>tebal</b>'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/<b>tebal<\/b>/)).toBeInTheDocument();
  });

  it("marks the last block while streaming", () => {
    const { container } = render(
      <CompanionMarkdown content={"Sedang menulis **jawaban**"} streaming />,
    );

    expect(container.firstElementChild).toHaveClass(
      "companion-prose",
      "is-streaming",
    );
  });
});

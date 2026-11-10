jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BelajarWorkspace } from "@/components/belajar/belajar-workspace";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/belajar",
  useRouter: () => ({ push }),
}));

/**
 * `/belajar` is a workspace now: the top app nav is gone and the left column is
 * the Companion sidebar, not a lookalike. These tests pin the shell contract
 * the page is built on — four destinations, Belajar current, and the new-chat
 * action that has to leave for Companion because thread state lives there.
 */
describe("BelajarWorkspace", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders the Companion sidebar and no site nav", () => {
    render(
      <BelajarWorkspace session={null}>
        <p>Katalog</p>
      </BelajarWorkspace>,
    );

    const nav = screen.getByRole("navigation", { name: /navigasi utama/i });
    expect(nav).toHaveTextContent("Companion");
    expect(nav).toHaveTextContent("Belajar");
    expect(nav).toHaveTextContent("Simulasi");
    expect(nav).toHaveTextContent("Komunitas");
    expect(screen.getByRole("link", { name: "Belajar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("main")).toHaveTextContent("Katalog");
    expect(screen.getByText(/belum ada percakapan/i)).toBeInTheDocument();
  });

  it("starts a new chat in Companion, not in the learning page", async () => {
    const user = userEvent.setup();
    render(
      <BelajarWorkspace session={null}>
        <p>Katalog</p>
      </BelajarWorkspace>,
    );

    await user.click(screen.getByRole("button", { name: /percakapan baru/i }));

    expect(push).toHaveBeenCalledWith("/companion");
  });

  it("links the agent overview to its own /agen address", () => {
    render(
      <BelajarWorkspace session={null}>
        <p>Katalog</p>
      </BelajarWorkspace>,
    );

    expect(screen.getByRole("link", { name: "Agen" })).toHaveAttribute(
      "href",
      "/agen",
    );
  });
});

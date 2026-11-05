import { render, screen } from "@testing-library/react";
import RunnerPage, {
  generateStaticParams,
} from "@/app/(app)/simulasi/[id]/page";

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Scenario not found");
  },
}));

describe("simulation routes", () => {
  it("prerenders only the playable level and opens the real mission briefing", async () => {
    expect(generateStaticParams()).toEqual([{ id: "L1-kurir-apk" }]);
    render(
      await RunnerPage({ params: Promise.resolve({ id: "L1-kurir-apk" }) }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /paket sebelum pulang/i,
    );
    expect(screen.getByText("Level 1 · Misi interaktif")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /pilih cara bermain/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /santai/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /mulai misi/i })).toBeEnabled();
  });

  it.each([
    "L2-phishing",
    "unknown",
  ])("does not substitute Level 1 for unbuilt scenario %s", async (id) => {
    await expect(
      RunnerPage({ params: Promise.resolve({ id }) }),
    ).rejects.toThrow("Scenario not found");
  });
});

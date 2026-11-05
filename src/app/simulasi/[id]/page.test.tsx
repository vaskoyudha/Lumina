import { render, screen } from "@testing-library/react";
import RunnerPage, { generateStaticParams } from "@/app/simulasi/[id]/page";

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Scenario not found");
  },
}));

describe("simulation routes", () => {
  it("prerenders only the playable level and renders its real runner", async () => {
    expect(generateStaticParams()).toEqual([{ id: "L1-kurir-apk" }]);
    render(
      await RunnerPage({ params: Promise.resolve({ id: "L1-kurir-apk" }) }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /kurir meminta pasang apk/i,
    );
    expect(screen.getByRole("button", { name: /^lanjut$/i })).toBeEnabled();
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
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

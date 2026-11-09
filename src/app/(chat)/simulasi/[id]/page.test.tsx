import { render, screen } from "@testing-library/react";
import RunnerPage, {
  generateStaticParams,
} from "@/app/(chat)/simulasi/[id]/page";

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Scenario not found");
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => "/simulasi/L1-kurir-apk",
}));

// The shared workspace shell reads the session through `next/server`, which
// jsdom cannot provide (`Request` is undefined). The runner does not depend on
// the account, so stub the read instead of polyfilling the whole edge runtime.
jest.mock("@/lib/auth/server-session", () => ({
  getSession: jest.fn().mockResolvedValue(null),
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
    expect(screen.getByText("Misi · Level 1")).toBeInTheDocument();
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

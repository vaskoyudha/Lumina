import { render, screen } from "@testing-library/react";
import { CompanionPanelFallback } from "@/components/companion/companion-panel-fallback";

jest.mock("@/lib/companion/history", () => ({
  listConversationHistory: jest.fn(async () => ({
    ok: true,
    conversations: [],
  })),
  saveConversationHistory: jest.fn(async () => ({ ok: true })),
}));

jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

let params = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(params),
  usePathname: () => "/companion",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

/**
 * `/companion?panel=agen` streams the real page behind a Suspense boundary.
 * The fallback is the first frame a slow navigation paints, so it must already
 * show the panel the URL asked for instead of the conversation.
 */
describe("CompanionPanelFallback", () => {
  it("paints the agent overview when the URL asks for it", () => {
    params = "panel=agen";
    render(<CompanionPanelFallback />);

    expect(
      screen.getByRole("heading", { name: "Agen pemeriksa" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/tempel pesan/i),
    ).not.toBeInTheDocument();
  });

  it("paints the conversation when no panel is requested", () => {
    params = "";
    render(<CompanionPanelFallback />);

    expect(
      screen.getByRole("heading", { level: 1, name: /periksa sebelum/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tempel pesan/i)).toBeInTheDocument();
  });
});

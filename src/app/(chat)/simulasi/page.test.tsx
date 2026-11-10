import { CONTENT_FIXTURE } from "@/lib/content/fixtures";

jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));

import { render, screen, within } from "@testing-library/react";
import { SimulasiContent as SimulasiPage } from "@/app/(chat)/simulasi/page";

// The page now lives under the shared workspace shell, whose session read pulls
// `next/server`; jsdom has no `Request`. The session is irrelevant to the
// rendered briefing, so stub it before the module graph loads.
jest.mock("@/lib/auth/server-session", () => ({
  getSession: jest.fn().mockResolvedValue(null),
}));

// `WorkspaceFrame` is a client shell; there is no Next router inside jsdom.
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => "/simulasi",
}));

describe("halaman misi simulasi", () => {
  it("menampilkan cerita fiktif, tiga babak, tiga akhir, dan jalur L1 yang hidup", async () => {
    render(await SimulasiPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Paket sebelum pulang" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/besok ulang tahun ibu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/perkiraan 3–5 menit/i).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/tanpa menyerahkan kendali ponselmu/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 kemungkinan akhir/i)).toBeInTheDocument();

    const status = screen.getByRole("region", { name: "Status simulasi" });
    expect(within(status).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(status).getByRole("timer", { name: /sisa waktu/i }),
    ).toBeInTheDocument();

    const chapters = screen.getByRole("region", { name: "Alur misi" });
    expect(within(chapters).getAllByRole("listitem")).toHaveLength(3);

    expect(
      screen.getByRole("link", { name: "Mulai briefing" }),
    ).toHaveAttribute("href", "/simulasi/L1-kurir-apk");
    const planned = screen.getByRole("region", { name: "Level lain" });
    expect(within(planned).getAllByRole("link")).toHaveLength(4);
    expect(within(planned).queryByText("Rencana")).not.toBeInTheDocument();
    expect(
      within(planned).getByRole("link", { name: /Tautan sebelum saldo/i }),
    ).toHaveAttribute("href", "/simulasi/L2-phishing-tautan");
  });
});

jest.mock("next/server", () => ({
  connection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/content/store", () => ({
  listModules: jest.fn(async () => CONTENT_FIXTURE.modules),
  listSimulations: jest.fn(async () => CONTENT_FIXTURE.simulations),
  moduleSummaries: jest.fn((modules) =>
    modules.map((m: (typeof CONTENT_FIXTURE.modules)[number]) => ({
      ...m.metadata,
      ready: !!m.content,
    })),
  ),
}));

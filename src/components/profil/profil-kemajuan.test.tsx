import { render, screen } from "@testing-library/react";
import { ProfilKemajuan } from "@/components/profil/profil-kemajuan";
import { isPublished } from "@/data/kurikulum";
import { MODUS } from "@/lib/modus";
import {
  completeModule,
  loadProgress,
  recordMissed,
  saveProgress,
} from "@/lib/progress";

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

describe("ProfilKemajuan", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the honest empty state after mount", async () => {
    render(<ProfilKemajuan />);

    expect(
      await screen.findByText(/belum ada modul selesai/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /mulai belajar/i }),
    ).toHaveAttribute("href", "/belajar");
  });

  it("counts completed modules and links to the finished one", async () => {
    saveProgress(completeModule(loadProgress(), 10));
    render(<ProfilKemajuan />);

    expect(
      await screen.findByText(
        new RegExp(`1 dari ${MODUS.length} modul selesai`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /10/ })).toHaveAttribute(
      "href",
      "/belajar/10",
    );
  });

  it("names the badge a finished module earns", async () => {
    saveProgress(completeModule(loadProgress(), 10));
    render(<ProfilKemajuan />);

    expect(await screen.findByText("Penjaga APK")).toBeInTheDocument();
  });

  it("reports the patterns still to review", async () => {
    saveProgress(recordMissed(loadProgress(), ["apk-q1", "apk-q3"]));
    render(<ProfilKemajuan />);

    await screen.findByText(/0 dari /);
    expect(
      screen.getAllByText(/pola kuis masih perlu ditinjau/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("marks unpublished modules as coming, not readable", async () => {
    const modus = MODUS.find((m) => m.no === 3);
    saveProgress(completeModule(loadProgress(), 3));
    render(<ProfilKemajuan />);

    expect(
      await screen.findByText(modus?.nama ?? "Modul 3"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(isPublished(3) ? "Lengkap" : "Segera"),
    ).toBeInTheDocument();
  });
});

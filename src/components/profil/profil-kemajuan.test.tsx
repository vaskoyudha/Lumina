import { screen } from "@testing-library/react";
import { ProfilKemajuan } from "@/components/profil/profil-kemajuan";
import { MODULE_FIXTURES } from "@/lib/content/fixtures";
import { completeModule, EMPTY_PROGRESS, recordMissed } from "@/lib/progress";
import { mockAccount, renderAccount } from "@/test/learning";

jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));
beforeEach(() => mockAccount());
it("shows the empty account state", async () => {
  renderAccount(<ProfilKemajuan modules={MODULE_FIXTURES} />);
  expect(
    await screen.findByText(/belum ada modul selesai/i),
  ).toBeInTheDocument();
});
it("shows account completion, badge and module link", async () => {
  mockAccount(completeModule(EMPTY_PROGRESS, 10));
  renderAccount(<ProfilKemajuan modules={MODULE_FIXTURES} />);
  expect(await screen.findByText(/1 dari 12/)).toBeInTheDocument();
  expect(screen.getByText("Penjaga APK")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /10/ })).toHaveAttribute(
    "href",
    "/belajar/10",
  );
});
it("shows missed quiz patterns", async () => {
  mockAccount(recordMissed(EMPTY_PROGRESS, ["q1"]));
  renderAccount(<ProfilKemajuan modules={MODULE_FIXTURES} />);
  expect(
    await screen.findByText(/pola kuis masih perlu ditinjau/i),
  ).toBeInTheDocument();
});

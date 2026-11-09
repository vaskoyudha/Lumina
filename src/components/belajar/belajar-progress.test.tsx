import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  BelajarProgress,
  ProgressNotice,
} from "@/components/belajar/belajar-progress";
import { getAccountProgress } from "@/lib/learning/actions";
import { completeModule, EMPTY_PROGRESS, STORAGE_KEY } from "@/lib/progress";
import { mockAccount, renderAccount } from "@/test/learning";

jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));
beforeEach(() => {
  mockAccount();
  window.localStorage.clear();
});
it("loads progress from the account, ignoring the device's old progress", async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(completeModule(EMPTY_PROGRESS, 1)),
  );
  mockAccount(completeModule(EMPTY_PROGRESS, 10));
  renderAccount(<BelajarProgress />);
  expect(
    await screen.findByText(/1 dari 12 modul selesai/),
  ).toBeInTheDocument();
  expect(screen.getByText(/Penjaga APK/)).toBeInTheDocument();
  expect(screen.queryByText(/Penjaga Marketplace/)).not.toBeInTheDocument();
});
it("replaces progress when a different account is read", async () => {
  mockAccount(completeModule(EMPTY_PROGRESS, 10));
  renderAccount(<BelajarProgress />);
  await screen.findByText(/1 dari 12/);
  mockAccount();
  fireEvent.focus(window);
  await screen.findByText(/0 dari 12/);
  expect(screen.queryByText(/Penjaga APK/)).not.toBeInTheDocument();
});
it("shows an honest failure with a retry", async () => {
  jest
    .mocked(getAccountProgress)
    .mockResolvedValue({ ok: false, error: "Database belum tersedia" });
  renderAccount(<ProgressNotice />);
  expect(
    await screen.findByText("Database belum tersedia"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /muat ulang/i })).toBeEnabled();
  await waitFor(() =>
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull(),
  );
});

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Runner } from "@/app/simulasi/[id]/Runner";
import { L1_KURIR_APK } from "@/lib/simulasi/scenario";

function click(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}
function toDecision() {
  click(/^lanjut$/i);
}
function toPermissions(wrong = false) {
  toDecision();
  click(wrong ? /pasang apk/i : /jangan buka file/i);
  click(/aktifkan mode pesawat/i);
}
function toOtp(wrong = false) {
  toPermissions(wrong);
  click(/izin sms: aktif/i);
  click(/izin aksesibilitas: aktif/i);
  click(/selesai memeriksa izin/i);
  click(/^lanjut$/i);
}
function finish() {
  click(/jangan bagikan otp/i);
  click(/tangkapan layar pesan/i);
  click(/siapkan laporan/i);
}
function expectDebriefAndLinks() {
  const ending = L1_KURIR_APK.nodes.find((node) => node.type === "ending");
  if (!ending || ending.type !== "ending") throw new Error("Ending missing");
  for (const line of ending.debrief)
    expect(screen.getByText(line)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /pelajari pola/i })).toHaveAttribute(
    "href",
    "/belajar/10",
  );
  expect(screen.getByRole("link", { name: /darurat/i })).toHaveAttribute(
    "href",
    "/darurat",
  );
  expect(screen.getByRole("link", { name: /semua simulasi/i })).toHaveAttribute(
    "href",
    "/simulasi",
  );
}

describe("Runner", () => {
  afterEach(() => jest.useRealTimers());

  it("requires both permissions and at least one selected evidence item, and resets", () => {
    render(<Runner />);
    toPermissions();
    const complete = screen.getByRole("button", {
      name: /selesai memeriksa izin/i,
    });
    expect(complete).toBeDisabled();
    click(/izin sms: aktif/i);
    expect(complete).toBeDisabled();
    click(/izin aksesibilitas: aktif/i);
    expect(complete).toBeEnabled();
    click(/selesai memeriksa izin/i);
    click(/^lanjut$/i);
    click(/jangan bagikan otp/i);
    const report = screen.getByRole("button", { name: /siapkan laporan/i });
    expect(report).toBeDisabled();
    click(/tangkapan layar pesan/i);
    expect(report).toBeEnabled();
    click(/tangkapan layar pesan/i);
    expect(report).toBeDisabled();
    click(/nama file apk/i);
    click(/siapkan laporan/i);
    expectDebriefAndLinks();
    expect(screen.getByText(/nama file apk\./i)).toBeInTheDocument();
    click(/ulangi simulasi/i);
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(
      screen.getByRole("progressbar", { name: /intrusi/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getAllByText("Terkunci")).toHaveLength(3);
  });

  it("preserves the risky APK choice without claiming the player did not install it", () => {
    render(<Runner />);
    toOtp(true);
    finish();
    expectDebriefAndLinks();
    const section = screen.getByRole("heading", {
      name: /pilihan berisiko/i,
    }).parentElement;
    expect(section).not.toBeNull();
    expect(
      within(section as HTMLElement).getByText(/pasang apk agar/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/kamu tidak memasang/i)).not.toBeInTheDocument();
  });

  it("shows OTP rationale and four scenario debriefs on panic failure", () => {
    render(<Runner />);
    toOtp(true);
    click(/kirim kode otp/i);
    expect(screen.getByText(/panik mengambil alih/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/otp memberi akses/i);
    expectDebriefAndLinks();
    expect(
      screen.queryByRole("button", { name: /siapkan laporan/i }),
    ).not.toBeInTheDocument();
    click(/ulangi simulasi/i);
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });

  it("advances intrusion on choice and tool, freezes after isolation and cleans up on ending and unmount", () => {
    jest.useFakeTimers();
    const clear = jest.spyOn(window, "clearInterval");
    const { unmount } = render(<Runner />);
    toDecision();
    act(() => jest.advanceTimersByTime(2000));
    expect(
      screen.getByRole("progressbar", { name: /intrusi/i }),
    ).toHaveAttribute("aria-valuenow", "4");
    click(/jangan buka file/i);
    act(() => jest.advanceTimersByTime(2000));
    expect(
      screen.getByRole("progressbar", { name: /intrusi/i }),
    ).toHaveAttribute("aria-valuenow", "8");
    click(/aktifkan mode pesawat/i);
    act(() => jest.advanceTimersByTime(5000));
    expect(
      screen.getByRole("progressbar", { name: /intrusi/i }),
    ).toHaveAttribute("aria-valuenow", "8");
    expect(clear).toHaveBeenCalled();
    click(/izin sms: aktif/i);
    click(/izin aksesibilitas: aktif/i);
    click(/selesai memeriksa izin/i);
    click(/^lanjut$/i);
    finish();
    click(/ulangi simulasi/i);
    toDecision();
    clear.mockClear();
    unmount();
    expect(clear).toHaveBeenCalledTimes(1);
    clear.mockRestore();
  });

  it("stops the timer at intrusion failure and reset clears it", () => {
    jest.useFakeTimers();
    const clear = jest.spyOn(window, "clearInterval");
    render(<Runner />);
    toDecision();
    act(() => jest.advanceTimersByTime(50_000));
    expect(
      screen.getByText(/aktivitas perangkat meningkat/i),
    ).toBeInTheDocument();
    expectDebriefAndLinks();
    expect(clear).toHaveBeenCalledTimes(1);
    click(/ulangi simulasi/i);
    act(() => jest.advanceTimersByTime(10_000));
    expect(
      screen.getByRole("progressbar", { name: /intrusi/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    clear.mockRestore();
  });
});

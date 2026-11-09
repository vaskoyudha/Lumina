import { SIMULATION_FIXTURE } from "@/lib/content/fixtures";

jest.mock("@/lib/learning/actions", () => ({
  getAccountProgress: jest.fn(),
  submitQuiz: jest.fn(),
  submitSimulation: jest.fn(),
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { Runner } from "@/app/(chat)/simulasi/[id]/Runner";
import {
  L1_KURIR_APK,
  PERMISSIONS,
  REPORT_ARTIFACTS,
} from "@/lib/simulasi/scenario";

const firstMessage = L1_KURIR_APK.nodes.find((node) => node.id === "intro");
if (!firstMessage || firstMessage.type !== "message")
  throw new Error("Intro message missing");

function click(name: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function revealMessage() {
  click(/tampilkan pesan sekarang/i);
}

function start(mode: "santai" | "tantangan" = "santai") {
  if (mode === "tantangan") click(/tantangan/i);
  click(/^mulai misi$/i);
}

function reachFirstDecision(mode: "santai" | "tantangan" = "santai") {
  start(mode);
  revealMessage();
  revealMessage();
}

function chooseVerifiedPath() {
  click(/cek pesanan lewat aplikasi belanja sendiri/i);
  revealMessage();
}

function addTwoSafeProofs() {
  click(/tangkapan layar percakapan/i);
  click(/nama berkas yang dikirim/i);
  expect(screen.getByRole("button", { name: /siapkan bukti/i })).toBeEnabled();
}

function expectEmergencyLinks() {
  expect(
    screen.getByRole("link", { name: /buka mode darurat/i }),
  ).toHaveAttribute("href", "/darurat");
  expect(screen.getByRole("link", { name: /semua simulasi/i })).toHaveAttribute(
    "href",
    "/simulasi",
  );
}

describe("Runner misi Paket sebelum pulang", () => {
  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("offers relaxed and challenge modes, then reveals delayed messages in sequence", () => {
    jest.useFakeTimers();
    render(<Runner content={SIMULATION_FIXTURE} />);

    expect(screen.getByText(/besok ulang tahun ibu/i)).toBeInTheDocument();
    const relaxed = screen.getByRole("button", { name: /santai/i });
    const challenge = screen.getByRole("button", { name: /tantangan/i });
    expect(relaxed).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(challenge);
    expect(challenge).toHaveAttribute("aria-pressed", "true");

    click(/^mulai misi$/i);
    expect(screen.queryByText(firstMessage.text)).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime((firstMessage.delay_ms ?? 0) - 1));
    expect(screen.queryByText(firstMessage.text)).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText(firstMessage.text)).toBeInTheDocument();
    expect(
      screen.queryByText(/foto paketnya, pasang dulu/i),
    ).not.toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1100));
    expect(screen.getByText(/foto paketnya, pasang dulu/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /periksa lampiran/i }),
    ).toBeEnabled();
  });

  it("pauses autoplay when hidden and resumes with the remaining delay", () => {
    jest.useFakeTimers();
    render(<Runner content={SIMULATION_FIXTURE} />);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.queryByText(/misi dijeda/i)).not.toBeInTheDocument();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    start();

    act(() => jest.advanceTimersByTime(400));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByText(/misi dijeda/i)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.queryByText(firstMessage.text)).not.toBeInTheDocument();

    click(/lanjutkan misi/i);
    act(() => jest.advanceTimersByTime(499));
    expect(screen.queryByText(firstMessage.text)).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText(firstMessage.text)).toBeInTheDocument();
  });

  it("lets the safe branch finish without device tools and reveals collected tactics", () => {
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision();
    chooseVerifiedPath();
    click(/hentikan chat dan simpan bukti/i);

    expect(
      screen.queryByRole("button", { name: /aktifkan mode pesawat/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cabut izin/i }),
    ).not.toBeInTheDocument();

    addTwoSafeProofs();
    click(/siapkan bukti/i);
    expect(screen.getByText(/hadiah boleh terlambat/i)).toBeInTheDocument();
    expectEmergencyLinks();

    click(/pola penipuan/i);
    expect(screen.getByText("Meminjam kepercayaan")).toBeInTheDocument();
    expect(screen.getByText("File menyamar")).toBeInTheDocument();
  });

  it("requires both device permissions and two safe proofs before recovery", () => {
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision();
    click(/periksa lampiran · foto_paket\.apk/i);
    expect(
      screen.getByText(/ini contoh, tidak ada unduhan/i),
    ).toBeInTheDocument();
    click(/pasang berkas agar paket tidak dibawa pergi/i);
    revealMessage();
    click(/aktifkan mode pesawat/i);

    for (const permission of PERMISSIONS) {
      const action = screen.getByRole("button", {
        name: new RegExp(`Cabut izin ${permission.label}`, "i"),
      });
      expect(action).toHaveAttribute("aria-pressed", "false");
    }
    const completePermissions = screen.getByRole("button", {
      name: /selesai memeriksa izin/i,
    });
    expect(completePermissions).toBeDisabled();
    click(/cabut izin baca sms/i);
    expect(completePermissions).toBeDisabled();
    click(/cabut izin layanan aksesibilitas/i);
    expect(completePermissions).toBeEnabled();
    click(/selesai memeriksa izin/i);
    revealMessage();
    click(/tolak permintaan otp dan siapkan bukti/i);

    const finishReport = screen.getByRole("button", { name: /siapkan bukti/i });
    expect(finishReport).toBeDisabled();
    addTwoSafeProofs();
    click(/siapkan bukti/i);
    expect(
      screen.getByText(/kamu sempat terjebak, lalu mengambil kendali/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/bukan jaminan perangkat sudah bersih/i),
    ).toBeInTheDocument();
    expectEmergencyLinks();

    click(/coba jalur lain/i);
    expect(screen.getByText("Briefing misi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mulai misi/i })).toBeEnabled();
  });

  it("rejects secret evidence and shows the compromised-account ending after OTP is shared", () => {
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision();
    chooseVerifiedPath();
    click(/kirim kode sms yang diminta/i);

    const unsafe = REPORT_ARTIFACTS.find((item) => !item.safe);
    if (!unsafe) throw new Error("Unsafe evidence fixture missing");
    const unsafeButton = screen.getByRole("button", {
      name: new RegExp(unsafe.label, "i"),
    });
    fireEvent.click(unsafeButton);
    expect(
      screen.getByText(/kode rahasia tidak aman disimpan sebagai bukti/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /siapkan bukti/i }),
    ).toBeDisabled();

    addTwoSafeProofs();
    click(/siapkan bukti/i);
    expect(
      screen.getAllByText(/kode telanjur dibagikan/i).length,
    ).toBeGreaterThan(1);
    expect(
      screen.getAllByText(/perangkat lain yang aman/i).length,
    ).toBeGreaterThan(1);
    expectEmergencyLinks();
  });

  it("runs challenge pressure only after compromise, pauses and freezes on isolation", () => {
    jest.useFakeTimers();
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision("tantangan");

    act(() => jest.advanceTimersByTime(10_000));
    expect(
      screen.getByRole("progressbar", { name: /akses asing/i }),
    ).toHaveAttribute("aria-valuenow", "0");

    click(/pasang berkas agar paket tidak dibawa pergi/i);
    act(() => jest.advanceTimersByTime(3000));
    const intrusion = screen.getByRole("progressbar", { name: /akses asing/i });
    expect(Number(intrusion.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
    click(/^jeda$/i);
    const pausedAt = intrusion.getAttribute("aria-valuenow");
    act(() => jest.advanceTimersByTime(5000));
    expect(intrusion).toHaveAttribute("aria-valuenow", pausedAt);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByText(/misi dijeda/i)).toBeInTheDocument();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    click(/lanjutkan misi/i);
    act(() => jest.advanceTimersByTime(2000));
    const resumedAt = Number(intrusion.getAttribute("aria-valuenow"));
    expect(resumedAt).toBeGreaterThan(Number(pausedAt));

    click(/aktifkan mode pesawat/i);
    const isolatedAt = intrusion.getAttribute("aria-valuenow");
    act(() => jest.advanceTimersByTime(5000));
    expect(intrusion).toHaveAttribute("aria-valuenow", isolatedAt);
  });

  it("keeps santai free of automatic intrusion and allows one breathing action", () => {
    jest.useFakeTimers();
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision("santai");
    click(/pasang berkas agar paket tidak dibawa pergi/i);

    act(() => jest.advanceTimersByTime(60_000));
    expect(
      screen.getByRole("progressbar", { name: /akses asing/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(screen.queryByText(/misi dihentikan/i)).not.toBeInTheDocument();

    const panic = screen.getByRole("progressbar", { name: /panik/i });
    expect(panic).toHaveAttribute("aria-valuenow", "45");
    click(/tarik napas/i);
    expect(panic).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByRole("button", { name: /tarik napas/i })).toBeDisabled();
  });

  it("stops at the intrusion limit and still presents all four debrief points", () => {
    jest.useFakeTimers();
    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision("tantangan");
    click(/pasang berkas agar paket tidak dibawa pergi/i);

    act(() => jest.advanceTimersByTime(50_000));
    expect(
      screen.getByText(/akses aplikasi dibiarkan terbuka terlalu lama/i),
    ).toBeInTheDocument();
    const ending = L1_KURIR_APK.nodes.find((node) => node.type === "ending");
    if (!ending || ending.type !== "ending")
      throw new Error("Ending fixture missing");
    for (const point of ending.debrief)
      expect(screen.getByText(point)).toBeInTheDocument();
  });

  it("cleans the challenge interval when the active mission is unmounted", () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(window, "clearInterval");
    const { unmount } = render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision("tantangan");
    click(/pasang berkas agar paket tidak dibawa pergi/i);
    act(() => jest.advanceTimersByTime(1000));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("resets the entire run and clears active timers on unmount", () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    const { unmount } = render(<Runner content={SIMULATION_FIXTURE} />);
    start();
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();

    render(<Runner content={SIMULATION_FIXTURE} />);
    reachFirstDecision();
    chooseVerifiedPath();
    click(/hentikan chat dan simpan bukti/i);
    addTwoSafeProofs();
    click(/siapkan bukti/i);
    click(/coba jalur lain/i);
    expect(screen.getByRole("button", { name: /mulai misi/i })).toBeEnabled();
    start();
    expect(screen.getAllByText(/belum ada akses/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(
      screen.getByRole("progressbar", { name: /akses asing/i }),
    ).toHaveAttribute("aria-valuenow", "0");
  });
});

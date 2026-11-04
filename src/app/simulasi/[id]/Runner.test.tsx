import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Runner } from "@/app/simulasi/[id]/Runner";

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

describe("Runner", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows rationale immediately, plays through tools, and resets cleanly", async () => {
    const user = userEvent.setup();
    render(<Runner />);

    await user.click(screen.getByRole("button", { name: /lanjut/i }));
    await user.click(screen.getByRole("button", { name: /pasang apk/i }));
    expect(screen.getByText(/apk dari pesan tak dikenal/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "45",
    );

    await user.click(
      screen.getByRole("button", { name: /aktifkan mode pesawat/i }),
    );
    await user.click(screen.getByRole("button", { name: /cabut izin sms/i }));
    await user.click(screen.getByRole("button", { name: /lanjut/i }));
    await user.click(
      screen.getByRole("button", { name: /jangan bagikan otp/i }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /tangkapan layar pesan/i }),
    );
    await user.click(screen.getByRole("button", { name: /siapkan laporan/i }));

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: /ulangi/i }));
    expect(
      screen.getByText(/pesan whatsapp mengaku dari kurir/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });

  it("fails and cleans up the decision interval at intrusion max", async () => {
    jest.useFakeTimers();
    render(<Runner />);
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .click(screen.getByRole("button", { name: /lanjut/i }));

    act(() => {
      jest.advanceTimersByTime(50_000);
    });
    expect(
      screen.getByText(/aktivitas perangkat meningkat/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ulangi simulasi/i }),
    ).toBeInTheDocument();

    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(
      screen.getByText(/aktivitas perangkat meningkat/i),
    ).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("ends at the panic threshold after a second risky choice", async () => {
    const user = userEvent.setup();
    render(<Runner />);

    await user.click(screen.getByRole("button", { name: /lanjut/i }));
    await user.click(screen.getByRole("button", { name: /pasang apk/i }));
    expect(screen.getByText(/apk dari pesan tak dikenal/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /aktifkan mode pesawat/i }),
    );
    await user.click(screen.getByRole("button", { name: /cabut izin sms/i }));
    await user.click(screen.getByRole("button", { name: /lanjut/i }));
    await user.click(screen.getByRole("button", { name: /kirim kode otp/i }));

    expect(screen.getByText(/panik mengambil alih/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ulangi simulasi/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /tangkapan layar pesan/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ulangi simulasi/i }));
    expect(
      screen.getByText(/pesan whatsapp mengaku dari kurir/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /panik/i })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
  });
});

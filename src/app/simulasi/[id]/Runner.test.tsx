import { render, screen } from "@testing-library/react";
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
});

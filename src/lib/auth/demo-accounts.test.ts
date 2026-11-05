import {
  DEMO_ACCOUNTS,
  emailTaken,
  findDemoAccount,
} from "@/lib/auth/demo-accounts";

describe("demo accounts", () => {
  it("seed exactly one empty state and one populated state", () => {
    expect(DEMO_ACCOUNTS).toHaveLength(2);
    expect(DEMO_ACCOUNTS[0]?.seed.completedModules).toEqual([]);
    expect(DEMO_ACCOUNTS[1]?.seed.completedModules.length).toBeGreaterThan(0);
  });

  it("accepts the documented credentials", () => {
    const account = findDemoAccount("siti@lumina.id", "demo1234");
    expect(account?.nama).toBe("Siti");
  });

  it("is case-insensitive and trims the email", () => {
    expect(findDemoAccount("  BUDI@Lumina.ID  ", "demo1234")?.nama).toBe(
      "Budi",
    );
  });

  it("rejects a wrong password", () => {
    expect(findDemoAccount("siti@lumina.id", "salah")).toBeNull();
  });

  it("rejects an unknown email", () => {
    expect(findDemoAccount("nobody@contoh.id", "demo1234")).toBeNull();
  });

  it("reports an email that is already taken", () => {
    expect(emailTaken("budi@lumina.id")).toBe(true);
    expect(emailTaken("baru@contoh.id")).toBe(false);
  });
});

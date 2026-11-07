import {
  DEMO_ACCOUNTS,
  emailTaken,
  findDemoAccount,
} from "@/lib/auth/demo-accounts";
import { MODUS } from "@/lib/modus";
import { BADGE_FOR_MODULE, BADGE_LABEL } from "@/lib/progress";

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

  it("only seeds badges that exist and only modules that exist", () => {
    const known = new Set(MODUS.map((m) => m.no));
    const labels = new Set(Object.keys(BADGE_LABEL));

    for (const account of DEMO_ACCOUNTS) {
      for (const no of account.seed.completedModules) {
        expect(known.has(no)).toBe(true);
      }
      for (const badge of account.seed.badges) {
        expect(labels.has(badge)).toBe(true);
      }
    }
  });

  it("seeds module 10 with the badge that module actually earns", () => {
    const budi = DEMO_ACCOUNTS.find((a) => a.email === "budi@lumina.id");
    expect(budi?.seed.completedModules).toContain(10);
    expect(budi?.seed.badges).toEqual([BADGE_FOR_MODULE[10]]);
  });
});

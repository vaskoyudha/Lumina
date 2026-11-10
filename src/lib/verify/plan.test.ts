import { describe, expect, it } from "@jest/globals";
import { planEnrichment } from "@/lib/verify/plan";

describe("planEnrichment", () => {
  it("plans nothing for clean text without a link", () => {
    const plan = planEnrichment({
      text: "Halo, apa kabar?",
      localRisk: "bersih",
    });
    expect(plan.verify).toEqual([]);
    expect(plan.urls).toEqual([]);
    expect(plan.budgetMs).toBe(2500);
    expect(plan.reason.length).toBeGreaterThan(0);
  });

  it("verifies an unknown link on a suspicious message", () => {
    const plan = planEnrichment({
      text: "Verifikasi di https://bca-verif.xyz/login sekarang",
      localRisk: "mencurigakan",
    });
    expect(plan.verify).toEqual(["link"]);
    expect(plan.urls).toEqual(["https://bca-verif.xyz/login"]);
  });

  it("skips an official domain when nothing else looks wrong", () => {
    const plan = planEnrichment({
      text: "Cek promo di https://bca.co.id/promo",
      localRisk: "bersih",
    });
    expect(plan.verify).toEqual([]);
    expect(plan.reason).toMatch(/domain resmi/i);
  });

  it("still verifies an official domain when the message is risky", () => {
    const plan = planEnrichment({
      text: "Cek promo di https://bca.co.id/promo",
      localRisk: "tinggi",
    });
    expect(plan.verify).toEqual(["link"]);
  });

  it("caps the plan at two targets", () => {
    const plan = planEnrichment({
      text: [
        "https://a-verif.xyz/login",
        "https://b-verif.xyz/login",
        "https://c-verif.xyz/login",
      ].join(" "),
      localRisk: "tinggi",
    });
    expect(plan.urls).toHaveLength(2);
  });

  it("checks a file only with consent, and leaves room in the budget", () => {
    const without = planEnrichment({
      text: "https://a-verif.xyz/login https://b-verif.xyz/login",
      hasAttachment: true,
      fileConsent: false,
      localRisk: "tinggi",
    });
    expect(without.verify).toEqual(["link"]);
    expect(without.urls).toHaveLength(2);

    const withConsent = planEnrichment({
      text: "https://a-verif.xyz/login https://b-verif.xyz/login",
      hasAttachment: true,
      fileConsent: true,
      localRisk: "tinggi",
    });
    expect(withConsent.verify).toEqual(["link", "file"]);
    expect(withConsent.urls).toHaveLength(1);
  });

  it("says headers were read locally instead of planning a network call", () => {
    const plan = planEnrichment({
      text: "Authentication-Results: spf=pass",
      hasHeaders: true,
      localRisk: "bersih",
    });
    expect(plan.verify).toEqual([]);
    expect(plan.reason).toMatch(/lokal/i);
  });

  it("adds a scheme to a bare domain so the route accepts it", () => {
    const plan = planEnrichment({
      text: "buka bca-verif.xyz/login sekarang",
      localRisk: "mencurigakan",
    });
    expect(plan.urls[0]).toMatch(/^https:\/\//);
  });
});

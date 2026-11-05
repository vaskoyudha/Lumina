import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

/**
 * (marketing) shell — light AppNext tokens, scoped under `.appnext`.
 * Never merged into --lumina-*; both are light now, but the type
 * scale and accent intensity differ on purpose.
 */
export const metadata: Metadata = {
  title: "Kenali penipuan sebelum uangnya hilang",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="appnext min-h-dvh bg-white">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

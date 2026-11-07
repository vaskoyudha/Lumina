import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QuickDrawer } from "@/components/marketing/quick-drawer";
import { Footer } from "@/components/marketing/sections/footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteProvider } from "@/components/marketing/site-provider";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kenali penipuan sebelum uangnya hilang",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`landing ${jakarta.variable} min-h-dvh overflow-x-clip`}>
      <SiteProvider>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
        <QuickDrawer />
      </SiteProvider>
      <Toaster />
    </div>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QuickDrawer } from "@/components/marketing/quick-drawer";
import { Footer } from "@/components/marketing/sections/footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteProvider } from "@/components/marketing/site-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/powder-fonts.css";
import "@/styles/powder-framer.css";
import "@/styles/powder-theme.css";

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
    <div
      suppressHydrationWarning
      className={`landing ${jakarta.variable} min-h-dvh overflow-x-clip`}
    >
      <script
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static pre-paint theme initialiser, no user input
        dangerouslySetInnerHTML={{
          __html:
            'try{var t=localStorage.getItem("lumina-theme");if(t==="warm")t="paper";var e=document.currentScript&&document.currentScript.parentElement;if(e&&(t==="paper"||t==="black"||t==="cream"))e.setAttribute("data-theme",t)}catch(_){}',
        }}
      />
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

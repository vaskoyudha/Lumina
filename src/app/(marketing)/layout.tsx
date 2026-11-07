import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/marketing/sections/footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteProvider } from "@/components/marketing/site-provider";
import SmoothScroll from "@/components/marketing/smooth-scroll";
import { ThemeSlider } from "@/components/marketing/theme-slider";
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
      data-theme="cream"
      className={`landing ${jakarta.variable} min-h-dvh overflow-x-clip`}
    >
      <script
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static pre-paint theme initialiser, no user input
        dangerouslySetInnerHTML={{
          __html:
            'try{var t=localStorage.getItem("lumina-theme");if(t==="warm")t="cream";var e=document.currentScript&&document.currentScript.parentElement;if(e&&(t==="paper"||t==="black"||t==="cream"))e.setAttribute("data-theme",t)}catch(_){}',
        }}
      />
      <SiteProvider>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </SiteProvider>
      <SmoothScroll />
      {/* Theme control floats clear of the nav, bottom-right of the viewport. */}
      <div className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6">
        <ThemeSlider />
      </div>
      <Toaster
        offset={{ bottom: 84, right: 20 }}
        mobileOffset={{ bottom: 84, right: 16 }}
      />
    </div>
  );
}

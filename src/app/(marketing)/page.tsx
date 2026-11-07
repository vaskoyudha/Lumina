import { About } from "@/components/marketing/sections/about";
import { Contact } from "@/components/marketing/sections/contact";
import { Faq } from "@/components/marketing/sections/faq";
import { Hero } from "@/components/marketing/sections/hero";
import { Pricing } from "@/components/marketing/sections/pricing";
import { Programs } from "@/components/marketing/sections/programs";
import { Transformation } from "@/components/marketing/sections/transformation";
import { Triage } from "@/components/marketing/sections/triage";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <About />
      <Programs />
      <Triage />
      <Transformation />
      <Pricing />
      <Contact />
      <Faq />
    </>
  );
}

import { PowderLayer } from "@/components/marketing/powder/powder-layer";
import AppearAnimations from "@/components/marketing/powder/runtime/AppearAnimations";
import GlowRuntime from "@/components/marketing/powder/runtime/GlowRuntime";
import Loop from "@/components/marketing/powder/runtime/Loop";
import Orbit from "@/components/marketing/powder/runtime/Orbit";
import StyleAppear from "@/components/marketing/powder/runtime/StyleAppear";
import PowderAbout from "@/components/marketing/powder/sections/About";
import PowderBlog from "@/components/marketing/powder/sections/Blog";
import PowderChangelog from "@/components/marketing/powder/sections/Changelog";
import PowderCTA from "@/components/marketing/powder/sections/CTA";
import PowderFeatures from "@/components/marketing/powder/sections/Features";
import PowderHero from "@/components/marketing/powder/sections/Hero";
import PowderIntegrations from "@/components/marketing/powder/sections/Integrations";
import PowderIntro from "@/components/marketing/powder/sections/Intro";
import PowderNumbers from "@/components/marketing/powder/sections/Numbers";
import SvgSprite from "@/components/marketing/powder/sections/SvgSprite";
import PowderTestimonials from "@/components/marketing/powder/sections/Testimonials";
import PowderWhy from "@/components/marketing/powder/sections/Why";
import { About } from "@/components/marketing/sections/about";
import { Contact } from "@/components/marketing/sections/contact";
import { Faq } from "@/components/marketing/sections/faq";
import { Hero } from "@/components/marketing/sections/hero";
import { Pricing } from "@/components/marketing/sections/pricing";
import { Programs } from "@/components/marketing/sections/programs";
import { Transformation } from "@/components/marketing/sections/transformation";
import { Triage } from "@/components/marketing/sections/triage";
import appearConfig from "@/data/powder/appear.json";

export default function LandingPage() {
  return (
    <>
      <PowderLayer surface="dark">
        <PowderHero />
      </PowderLayer>
      <PowderLayer>
        <PowderIntro />
      </PowderLayer>
      <Hero />
      <About />
      <Programs />
      <Triage />
      <Transformation />
      <PowderLayer>
        <PowderFeatures />
      </PowderLayer>
      <PowderLayer tint>
        <PowderWhy />
      </PowderLayer>
      <PowderLayer>
        <PowderAbout />
      </PowderLayer>
      <PowderLayer tint>
        <PowderIntegrations />
      </PowderLayer>
      <PowderLayer>
        <PowderChangelog />
      </PowderLayer>
      <PowderLayer tint>
        <PowderNumbers />
      </PowderLayer>
      <PowderLayer>
        <PowderTestimonials />
      </PowderLayer>
      <Pricing />
      <Faq />
      <PowderLayer tint>
        <PowderBlog />
      </PowderLayer>
      <Contact />
      <PowderLayer surface="dark">
        <PowderCTA />
      </PowderLayer>
      <SvgSprite />
      <AppearAnimations config={appearConfig} />
      <StyleAppear />
      <GlowRuntime />
      <Orbit />
      <Loop />
    </>
  );
}

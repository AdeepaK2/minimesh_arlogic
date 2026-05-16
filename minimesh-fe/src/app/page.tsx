import { Navbar } from "@/components/landing/navbar";
import {
  CtaBand,
  ExportSection,
  Features,
  Footer,
  Hero,
  HowItWorks,
  Pricing,
  SocialProof,
  UseCases,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <div className="min-h-full bg-[#0a0a0f] text-zinc-100">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <UseCases />
        <ExportSection />
        <Pricing />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

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
    <div className="landing-page min-h-full bg-landing">
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
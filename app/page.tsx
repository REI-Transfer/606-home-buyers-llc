import { Header } from "@/components/v2/header";
import { HeroSection } from "@/components/v2/hero-section";
import { PhilosophySection } from "@/components/v2/philosophy-section";
import { VslSection } from "@/components/v2/vsl-section";
import { TrustSection } from "@/components/v2/trust-section";
import { SalesLetterSection } from "@/components/v2/sales-letter-section";
import { FaqSection } from "@/components/v2/faq-section";
import { FooterSection } from "@/components/v2/footer-section";
import { buildBrand } from "@/lib/brand";
import config from "@/lib/config";

export default function HomePage() {
  const brand = buildBrand();
  const allowedCounties = config.allowedCounties.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <main className="v2-light min-h-screen" style={{ ["--brand-accent" as any]: brand.accentColor }}>
      <Header brand={brand} />
      <HeroSection brand={brand} allowedCounties={allowedCounties} />
      <PhilosophySection brand={brand} />
      <VslSection brand={brand} />
      <TrustSection brand={brand} />
      <SalesLetterSection brand={brand} />
      <FaqSection brand={brand} />
      <FooterSection brand={brand} />
    </main>
  );
}

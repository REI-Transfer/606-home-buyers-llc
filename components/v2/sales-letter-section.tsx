"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { marketPhrase, type Brand } from "@/lib/brand";

type Block =
  | { type: "hook-headline"; content: string }
  | { type: "subheadline"; content: string }
  | { type: "body"; content: string }
  | { type: "valueprop"; content: string }
  | { type: "step"; content: string }
  | { type: "comparison"; content: string }
  | { type: "divider"; content: string }
  | { type: "cta"; content: string };

function buildBlocks(brand: Brand): Block[] {
  const company = brand.companyName;
  const market = marketPhrase(brand);
  return [
    { type: "hook-headline", content: "A Simple, Honest Way to Sell Your House" },
    {
      type: "body",
      content: `${company} buys houses directly from homeowners in ${market}. No listings, no showings, no repairs — just a fair cash offer and a closing date you choose.`,
    },
    { type: "valueprop", content: "No Repairs Needed|Sell exactly as-is. Leaky roof, dated kitchen, tenant damage — we handle it. You fix nothing and clean nothing." },
    { type: "valueprop", content: "No Fees or Commissions|No agent commissions and no closing costs. The number on your offer is the number you walk away with." },
    { type: "valueprop", content: "Close On Your Timeline|Need to close in a week? Need sixty days to sort out your next move? You pick the date that works for you." },
    { type: "valueprop", content: "A Fair, Final Offer|We do our homework before we make an offer, so the number doesn't get chipped away after we see the home." },
    { type: "divider", content: "" },
    { type: "subheadline", content: "How This Works" },
    { type: "step", content: "Tell us about your property.|It takes about two minutes. Enter your address above and answer a few quick questions. No commitment, no pressure." },
    { type: "step", content: "We make you a fair cash offer.|We research your property, the neighborhood, and comparable sales, then give you a number that won't change." },
    { type: "step", content: "You pick your closing date.|Accept the offer if it works for you and choose when to close. We pay the closing costs. If it's not a fit, no hard feelings." },
    { type: "divider", content: "" },
    { type: "subheadline", content: "Why Homeowners Choose Us Over a Traditional Listing" },
    { type: "comparison", content: "" },
    { type: "cta", content: "Get your cash offer now — it only takes two minutes." },
  ];
}

function ComparisonTable({ company }: { company: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="py-4 px-4 text-base font-semibold text-muted-foreground border-b border-border"></th>
            <th className="py-4 px-4 text-base font-semibold text-[#1B2A4A] border-b border-border bg-[#1B2A4A]/10">{company}</th>
            <th className="py-4 px-4 text-base font-semibold text-muted-foreground border-b border-border">Traditional Listing</th>
          </tr>
        </thead>
        <tbody className="text-base">
          {[
            ["Timeline", "7 to 30 days", "90 to 180+ days"],
            ["Repairs Needed", "None. Sell as-is.", "Usually $5K to $30K+"],
            ["Agent Fees", "$0", "5% to 6% of sale price"],
            ["Closing Costs", "We pay them", "You pay them"],
            ["Showings", "None", "Dozens of strangers in your home"],
            ["Offer Changes", "Never. Our number is final.", "Buyer can renegotiate after inspection"],
            ["Certainty", "Cash. No financing contingencies.", "Buyer's loan can fall through"],
          ].map(([feature, express, traditional], i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-3 px-4 font-medium text-foreground">{feature}</td>
              <td className="py-3 px-4 text-[#1B2A4A] bg-[#1B2A4A]/10 font-medium">{express}</td>
              <td className="py-3 px-4 text-muted-foreground">{traditional}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalesLetterSection({ brand }: { brand: Brand }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const blocks = buildBlocks(brand);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = Number(entry.target.getAttribute("data-index"));
        setVisibleItems((prev) => new Set([...prev, index]));
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    });

    const elements = sectionRef.current?.querySelectorAll("[data-index]");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [handleIntersection]);

  let stepCount = 0;

  const scrollToHero = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} className="bg-background py-20 md:py-32 lg:py-40">
      <div className="mx-auto max-w-3xl px-6 md:px-12">
        {blocks.map((paragraph, index) => {
          const isVisible = visibleItems.has(index);

          if (paragraph.type === "hook-headline") {
            return (
              <div
                key={index}
                data-index={index}
                className={`mb-12 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {paragraph.content}
                </h2>
                <div className="mt-6 h-1 w-20 bg-[color:var(--brand-accent)]" />
              </div>
            );
          }

          if (paragraph.type === "subheadline") {
            return (
              <div
                key={index}
                data-index={index}
                className={`mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  {paragraph.content}
                </h3>
              </div>
            );
          }

          if (paragraph.type === "valueprop") {
            const [title, description] = paragraph.content.split("|");
            return (
              <div
                key={index}
                data-index={index}
                className={`mb-4 rounded-xl border border-border bg-card p-6 border-l-4 border-l-[color:var(--brand-accent)] transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <h4 className="font-semibold text-foreground text-xl">{title}</h4>
                <p className="mt-2 text-muted-foreground text-lg leading-relaxed">{description}</p>
              </div>
            );
          }

          if (paragraph.type === "divider") {
            return (
              <div
                key={index}
                data-index={index}
                className="my-12 md:my-16"
              >
                <div className="h-px bg-border" />
              </div>
            );
          }

          if (paragraph.type === "step") {
            stepCount++;
            const [title, description] = paragraph.content.split("|");
            return (
              <div
                key={index}
                data-index={index}
                className={`mb-8 flex gap-5 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <div className="flex-shrink-0 flex items-start justify-center w-10 h-10 rounded-full bg-[#1B2A4A] text-white font-bold text-lg">
                  {stepCount}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-xl">{title}</h4>
                  <p className="mt-2 text-muted-foreground text-lg leading-relaxed">{description}</p>
                </div>
              </div>
            );
          }

          if (paragraph.type === "comparison") {
            return (
              <div
                key={index}
                data-index={index}
                className={`mb-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <ComparisonTable company={brand.companyName} />
              </div>
            );
          }

          if (paragraph.type === "cta") {
            return (
              <div
                key={index}
                data-index={index}
                className={`mt-12 text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <button
                  onClick={scrollToHero}
                  className="inline-flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#131E36] text-white font-semibold text-xl px-12 py-5 rounded-2xl transition-all shadow-lg"
                >
                  Get My Cash Offer Now
                </button>
                <p className="mt-4 text-muted-foreground text-sm italic">
                  {paragraph.content}
                </p>
              </div>
            );
          }

          return (
            <div
              key={index}
              data-index={index}
              className={`mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <p className="leading-relaxed text-muted-foreground text-lg md:text-xl">
                {paragraph.content}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

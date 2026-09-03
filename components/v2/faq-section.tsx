"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { marketPhrase, type Brand } from "@/lib/brand";

function buildFaqs(brand: Brand) {
  const company = brand.companyName;
  const market = marketPhrase(brand);
  return [
    {
      question: "How does the cash offer process work?",
      answer: `Enter your address and answer a few quick questions. ${company} reviews your property details and comparable sales, then follows up with a fair cash offer — usually within 24 hours. There's no cost and no obligation.`,
    },
    {
      question: "Do I need to make any repairs before selling?",
      answer: "No. We buy houses in any condition. Roof damage, outdated kitchens, overgrown yards, tenant damage — we've seen it all. You don't need to fix, clean, or stage anything.",
    },
    {
      question: "Are there any fees or commissions?",
      answer: "Zero. No agent commissions (which typically run 5% to 6% of the sale price), no closing costs, and no hidden fees. The offer we give you is the amount you walk away with at closing.",
    },
    {
      question: "How fast can you close?",
      answer: "As fast as 7 days if you need it. If you need 30 or 60 days to get settled, that works too. You pick the closing date that makes sense for your situation.",
    },
    {
      question: "Is there any obligation to accept the offer?",
      answer: "None at all. Getting an offer is completely free with no strings attached. Review it on your own time and accept only if it's the right fit for you.",
    },
    {
      question: "What areas do you buy in?",
      answer: `We buy homes in ${market}. Enter your address above to get started and we'll let you know right away if your property qualifies.`,
    },
  ];
}

export function FaqSection({ brand }: { brand: Brand }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = buildFaqs(brand);

  return (
    <section id="faq" className="bg-secondary py-20 md:py-32">
      <div className="mx-auto max-w-3xl px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground text-center mb-4">
          Common Questions
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-12">
          Straight answers. No runaround.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-background overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-medium text-foreground text-lg pr-4">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="px-6 pb-5 text-muted-foreground text-base leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

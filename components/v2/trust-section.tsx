"use client";

import { Shield, Clock, Home, DollarSign, Star } from "lucide-react";
import type { Brand } from "@/lib/brand";

const guarantees = [
  {
    icon: DollarSign,
    title: "A Fair, Final Offer",
    description: "The number we offer is the number you get at closing. We factor in the home's condition up front, so there are no surprise deductions later.",
  },
  {
    icon: Clock,
    title: "24-Hour Offer",
    description: "Submit your property info and we'll have a fair cash offer in your hands within 24 hours. No waiting. No wondering. No runaround.",
  },
  {
    icon: Shield,
    title: "Zero Fees. Zero Commissions.",
    description: "We pay all closing costs. No agent fees. No hidden charges. The number on your offer is exactly what you take home at closing.",
  },
];

export function TrustSection({ brand }: { brand: Brand }) {
  const stats = [
    { icon: Home, value: brand.stat1Value, label: brand.stat1Label },
    { icon: Clock, value: brand.stat2Value, label: brand.stat2Label },
    { icon: Star, value: brand.stat3Value, label: brand.stat3Label },
  ];

  return (
    <section className="bg-[#F5F7FA] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="h-9 w-9 text-[color:var(--brand-accent)] mx-auto mb-3" />
              <div className="text-4xl md:text-5xl font-bold text-[#0F1D2F]">{stat.value}</div>
              <div className="text-base text-[#5A6B7D] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {guarantees.map((guarantee, index) => (
            <div
              key={index}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
            >
              <guarantee.icon className="h-11 w-11 text-[color:var(--brand-accent)] mb-5" />
              <h3 className="text-xl font-semibold text-[#0F1D2F] mb-3">{guarantee.title}</h3>
              <p className="text-[#5A6B7D] leading-relaxed text-base">{guarantee.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

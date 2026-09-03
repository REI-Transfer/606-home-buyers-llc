"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { marketPhrase, type Brand } from "@/lib/brand";

export function FooterSection({ brand }: { brand: Brand }) {
  const scrollToHero = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0F1D2F]">
      {/* Final CTA */}
      <div className="border-b border-white/10 px-6 py-16 md:px-12 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Ready to See What Your Home Is Worth?
        </h2>
        <p className="text-white/60 mb-8 max-w-lg mx-auto">
          No pressure. No obligation. Just a fair number from a team that keeps its word.
        </p>
        <button
          onClick={scrollToHero}
          className="inline-flex items-center gap-2 bg-[color:var(--brand-accent)] hover:opacity-90 text-white font-semibold text-xl px-12 py-5 rounded-2xl transition-all"
        >
          Get My Cash Offer
        </button>
      </div>

      {/* Footer Content */}
      <div className="px-6 py-12 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold tracking-tight text-white">{brand.companyName}</span>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Buying houses for cash in {marketPhrase(brand)}. Fair offers that never change.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-medium text-white">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href={`tel:${brand.phoneHref}`} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                  {brand.phoneDisplay}
                </a>
              </li>
              {brand.callinDisplay && brand.callinHref && (
                <li>
                  <a href={`tel:${brand.callinHref}`} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <Phone className="h-4 w-4" />
                    {brand.callinDisplay}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-medium text-white">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#hero" className="text-sm text-white/50 hover:text-white transition-colors">
                  Get Cash Offer
                </Link>
              </li>
              <li>
                <Link href="#faq" className="text-sm text-white/50 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} {brand.companyName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

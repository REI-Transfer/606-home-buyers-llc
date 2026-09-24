"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, ArrowRight } from "lucide-react";
import { AddressAutocomplete, type AddressAutocompleteHandle, type AddressDetails } from "@/components/survey/address-autocomplete";
import { SurveyCard } from "@/components/v2/survey-card";
import type { Brand } from "@/lib/brand";

export function Header({ brand, allowedCounties = [], allowedStates = [] }: { brand: Brand; allowedCounties?: string[]; allowedStates?: string[] }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [address, setAddress] = useState("");
  const [showSurvey, setShowSurvey] = useState(false);
  // The scrolled-header address box skips the survey's address step, so it must
  // pass the same location gate as the hero before it opens the survey.
  const [addressOk, setAddressOk] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [addressDetails, setAddressDetails] = useState<AddressDetails | undefined>();
  const addressRef = useRef<AddressAutocompleteHandle>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const heroEl = document.getElementById("hero");
      if (heroEl) {
        const heroBottom = heroEl.offsetTop + heroEl.offsetHeight;
        setPastHero(window.scrollY > heroBottom - 200);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddressSelect = (addr: string, details: AddressDetails) => {
    setAddress(addr);
    setAddressDetails(details);
    setAddressOk(true);
    setOutOfArea(false);
    setShowSurvey(true);
  };

  // Go button and Enter: a typed address that wasn't picked from the list is
  // looked up and sent through the same select / out-of-area path as tapping it.
  const handleGo = () => {
    if (addressOk) setShowSurvey(true);
    else addressRef.current?.resolveTyped();
  };

  return (
    <>
      <header
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-5xl transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-[#E2E8F0]"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="flex items-center justify-between transition-all duration-300 px-4 pl-6 py-2.5 md:px-10 md:py-5">
          <Link href="#hero" className="min-w-0 flex-shrink mr-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.companyName} width={320} height={80} className="h-16 md:h-20 w-auto max-w-[56vw] md:max-w-[280px] object-contain" />
            ) : (
              <span className="block truncate max-w-[52vw] md:max-w-[420px] text-base md:text-2xl font-bold tracking-tight text-[#0F1D2F]">{brand.companyName}</span>
            )}
          </Link>

          {pastHero && !showSurvey && (
            <div className="hidden md:flex flex-1 max-w-md mx-4 animate-reveal-up" style={{ animationDuration: '0.3s' }}>
              <div className="relative w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <AddressAutocomplete
                    ref={addressRef}
                    onSubmit={handleGo}
                    hintClassName="absolute left-0 top-full mt-1 text-xs font-medium"
                    value={address}
                    onChange={(a) => { setAddress(a); setAddressOk(false); setOutOfArea(false); }}
                    onSelect={handleAddressSelect}
                    onOutOfArea={(a) => { setAddress(a); setAddressOk(false); setOutOfArea(true); }}
                    allowedStates={allowedStates}
                    allowedCounties={allowedCounties}
                    placeholder="Enter your address..."
                    className="[&_input]:h-9 [&_input]:text-sm [&_input]:rounded-lg [&_input]:bg-[#F5F7FA] [&_input]:border-[#E2E8F0]"
                  />
                </div>
                <button
                  onClick={handleGo}
                  className="shrink-0 h-9 px-4 bg-[#1B2A4A] hover:bg-[#131E36] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Go
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                {outOfArea && (
                  <p className="absolute left-0 top-full mt-1 text-xs font-medium" style={{ color: "#dc2626" }}>
                    That address is outside our buying area.
                  </p>
                )}
              </div>
            </div>
          )}

          {pastHero && !showSurvey && (
            <button
              onClick={() => setShowSurvey(true)}
              className="md:hidden px-4 py-1.5 text-xs font-medium rounded-full bg-[#1B2A4A] text-white"
            >
              Get Offer
            </button>
          )}

          <a
            href={`tel:${brand.phoneHref}`}
            className="hidden md:flex items-center gap-2 text-sm text-[#5A6B7D] hover:text-[#0F1D2F] transition-colors shrink-0"
          >
            <Phone className="h-3.5 w-3.5" />
            {brand.phoneDisplay}
          </a>

          {!pastHero && (
            <button
              onClick={() => setShowSurvey(true)}
              className="shrink-0 whitespace-nowrap px-4 py-2.5 text-sm md:px-5 md:py-2 md:text-sm font-semibold transition-all rounded-full bg-[#1B2A4A] text-white hover:bg-[#131E36]"
            >
              Get Cash Offer
            </button>
          )}
        </div>
      </header>

      {showSurvey && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl animate-scale-in">
            <button
              onClick={() => setShowSurvey(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-base transition-colors"
            >
              Close
            </button>
            <SurveyCard initialAddress={addressOk ? address : ""} initialDetails={addressOk ? addressDetails : undefined} brand={brand} allowedCounties={allowedCounties} allowedStates={allowedStates} />
          </div>
        </div>
      )}
    </>
  );
}

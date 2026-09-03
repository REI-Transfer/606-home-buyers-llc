"use client";

import { useState } from "react";
import { ArrowRight, ArrowDown, Shield, Clock, DollarSign } from "lucide-react";
import { SurveyCard } from "@/components/v2/survey-card";
import { AddressAutocomplete, type AddressDetails } from "@/components/survey/address-autocomplete";
import { isWithinServiceArea } from "@/lib/service-area";
import { marketPhrase, type Brand } from "@/lib/brand";

export function HeroSection({ brand, allowedCounties = [] }: { brand: Brand; allowedCounties?: string[] }) {
  const [showSurvey, setShowSurvey] = useState(false);
  const [initialAddress, setInitialAddress] = useState("");
  const [addressVerified, setAddressVerified] = useState(false);
  const [outsideAreaError, setOutsideAreaError] = useState(false);

  const hasPhoto = !!brand.foundersPhotoUrl;

  const countyOk = (details: AddressDetails) => {
    if (!allowedCounties || allowedCounties.length === 0) return true;
    const n = (c?: string) => (c || "").replace(/\s+county$/i, "").trim().toLowerCase();
    return !!(details.state && details.state.toUpperCase() === "TX" && details.county && allowedCounties.map(n).includes(n(details.county)));
  };

  const handleAddressSelect = (address: string, details: AddressDetails) => {
    // Env-driven service-area gate. Permissive when NEXT_PUBLIC_SERVICE_AREAS is empty.
    if (countyOk(details) && isWithinServiceArea(details.lat, details.lng)) {
      setInitialAddress(address);
      setAddressVerified(true);
      setOutsideAreaError(false);
      setShowSurvey(true);
    } else {
      setAddressVerified(false);
      setOutsideAreaError(true);
    }
  };

  return (
    <section id="hero" className="relative bg-white overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch min-h-[100dvh] px-4 pt-28 pb-8 md:px-12 md:pb-20 lg:px-16 lg:pt-16 lg:pb-0 gap-6 lg:gap-0">

        {/* Left — owner cut-out photo (desktop only) */}
        {hasPhoto && (
          <div className="hidden lg:flex lg:w-[45%] items-end justify-center relative">
            <div className="flex flex-col items-center">
              <img
                src={brand.foundersPhotoUrl}
                alt={brand.ownerName ? `${brand.ownerName}, ${brand.companyName}` : brand.companyName}
                className="h-[80vh] w-auto object-contain object-bottom"
              />
              {brand.foundersCaption && (
                <p className="text-center text-sm text-[#5A6B7D] pb-4 max-w-xs">{brand.foundersCaption}</p>
              )}
            </div>
          </div>
        )}

        {/* Right — form content */}
        <div className={`w-full flex flex-col items-center justify-center lg:py-20 ${hasPhoto ? "lg:w-[55%]" : "lg:w-full"}`}>
          {/* Trust badges */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-6 mb-4 mt-4 lg:mt-0 animate-reveal-up">
            <div className="flex items-center gap-2 text-[#5A6B7D] text-base">
              <Shield className="h-4 w-4 text-[#1B2A4A]" />
              <span>Trusted </span>
            </div>
            <div className="flex items-center gap-2 text-[#5A6B7D] text-base">
              <Clock className="h-4 w-4 text-[#1B2A4A]" />
              <span>24-Hour Cash Offers</span>
            </div>
            <div className="flex items-center gap-2 text-[#5A6B7D] text-base">
              <DollarSign className="h-4 w-4 text-[#1B2A4A]" />
              <span>No Fees. No Commissions.</span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-[#0F1D2F] md:text-5xl lg:text-5xl max-w-2xl animate-reveal-up animation-delay-100">
            {brand.headline}
            {brand.headlineAccent && (
              <>
                <br />
                <span className="text-[color:var(--brand-accent)]">{brand.headlineAccent}</span>
              </>
            )}
          </h1>

          {/* Subheadline */}
          <p className="mt-2 md:mt-4 text-center text-base md:text-xl text-[#5A6B7D] max-w-xl leading-relaxed animate-reveal-up animation-delay-200">
            {brand.subheadline}
          </p>

          {/* Address Input or Survey */}
          <div className="mt-4 md:mt-6 w-full max-w-2xl animate-reveal-up animation-delay-300">
            {!showSurvey ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#1B2A4A] text-base font-medium">Enter your address to start</span>
                  <ArrowDown className="h-5 w-5 text-[#1B2A4A] animate-bounce" />
                </div>
                <div className="relative">
                  <AddressAutocomplete
                    value={initialAddress}
                    onChange={(address) => { setInitialAddress(address); setAddressVerified(false); setOutsideAreaError(false); }}
                    onSelect={handleAddressSelect}
                    placeholder="Enter your property address..."
                    className="[&_input]:h-14 [&_input]:text-lg [&_input]:rounded-2xl [&_input]:shadow-lg [&_input]:border-[#1B2A4A]/30 [&_input]:bg-white"
                  />
                </div>
                <button
                  onClick={() => { if (addressVerified) setShowSurvey(true) }}
                  className="w-full h-14 bg-[#1B2A4A] hover:bg-[#131E36] text-white font-semibold text-xl rounded-2xl transition-all shadow-lg shadow-[#1B2A4A]/20 flex items-center justify-center gap-2"
                >
                  Get My Free Cash Offer
                  <ArrowRight className="h-6 w-6" />
                </button>
                {outsideAreaError && (
                  <p className="text-center text-sm font-medium" style={{ color: "#dc2626" }}>
                    Sorry, that address is outside our current buying area. Please enter a property in {marketPhrase(brand)}.
                  </p>
                )}
                <p className="hidden md:block text-center text-[#94A3B8] text-sm">
                  Takes less than 2 minutes. No obligation.
                </p>
                {/* Generic trust badges */}
                <div className="flex flex-col items-start md:flex-row md:items-center md:justify-center gap-1.5 md:gap-5 mt-2 md:mt-3">
                  <div className="flex items-center gap-2 md:gap-3 bg-white rounded-xl px-2 py-1.5 md:px-6 md:py-4 shadow-sm border border-gray-200">
                    <span className="text-3xl md:text-5xl font-bold text-[#00529B]">A+</span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm md:text-lg font-bold text-[#00529B]">BBB</span>
                      <span className="text-xs md:text-sm text-gray-600">ACCREDITED</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 bg-white rounded-xl px-2 py-1.5 md:px-6 md:py-4 shadow-sm border border-gray-200">
                    <svg viewBox="0 0 272 92" className="h-6 md:h-10 w-auto" aria-label="Google">
                      <path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#EA4335"/>
                      <path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#FBBC05"/>
                      <path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z" fill="#4285F4"/>
                      <path d="M225 3v65h-9.5V3h9.5z" fill="#34A853"/>
                      <path d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" fill="#EA4335"/>
                      <path d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.01z" fill="#4285F4"/>
                    </svg>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="h-5 w-5 md:h-7 md:w-7 text-[#F4B400] fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-scale-in">
                <SurveyCard initialAddress={initialAddress} brand={brand} allowedCounties={allowedCounties} />
              </div>
            )}
          </div>

          {/* Mobile — owner cut-out. Orientation-agnostic: the image renders at its
              natural aspect ratio, capped to 300px tall AND the screen width, so
              BOTH portrait and landscape headshots show in full — never cropped,
              stretched, or overflowing. Desktop uses the left column. */}
          {hasPhoto && (
            <div className="lg:hidden mt-8 w-full flex flex-col items-center">
              <div className="relative inline-block overflow-hidden">
                <img
                  src={brand.foundersPhotoUrl}
                  alt={brand.ownerName ? `${brand.ownerName}, ${brand.companyName}` : brand.companyName}
                  className="block max-h-[300px] w-auto max-w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent" />
              </div>
              {brand.foundersCaption && (
                <p className="text-center text-sm text-[#5A6B7D] mt-2 max-w-xs">{brand.foundersCaption}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

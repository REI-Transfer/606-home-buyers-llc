"use client";

import { useState } from "react";
import type { Brand } from "@/lib/brand";

const heroVideoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "";
const youtubeIds = (process.env.NEXT_PUBLIC_YOUTUBE_IDS || "")
  .split(",")
  .filter(Boolean);

function YouTubeThumbnail({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-[#E2E8F0] shadow-md"
        style={{ paddingTop: "56.25%" }}
      >
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Property showcase"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative w-full overflow-hidden rounded-xl border border-[#E2E8F0] shadow-md group cursor-pointer"
      style={{ paddingTop: "56.25%" }}
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt="Property showcase"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <svg
            className="w-6 h-6 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export function VslSection({ brand }: { brand: Brand }) {
  if (!heroVideoUrl && youtubeIds.length === 0) return null;

  return (
    <section className="bg-white px-6 py-16 md:py-24">
      <div className="max-w-4xl mx-auto">
        {heroVideoUrl && (
          <>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F1D2F] mb-2 text-center">
              See How It Works
            </h2>
            <p className="text-center text-[#5A6B7D] text-lg mb-8">
              Watch how {brand.companyName} makes selling your home fast and
              stress-free.
            </p>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] mb-16">
              <video
                src={heroVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full"
                style={{ aspectRatio: "16/9", objectFit: "cover" }}
              />
            </div>
          </>
        )}

        {youtubeIds.length > 0 && (
          <>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F1D2F] mb-2 text-center">
              See Our Recent Projects
            </h2>
            <p className="text-center text-[#5A6B7D] text-lg mb-8">
              Real transformations from real homeowners in your area.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {youtubeIds.map((id) => (
                <YouTubeThumbnail key={id} videoId={id} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

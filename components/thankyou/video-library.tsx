"use client";

import { useState } from "react";
import { Play, ChevronDown } from "lucide-react";
import type { VideoCategory, VideoItem } from "@/lib/thankyou-videos";

// Adapted from Elevate's VideoShowcase: one bounded card with a MAIN PLAYER +
// accordion category sidebar. Main player is PORTRAIT (9:16) for 606's vertical
// videos; player left / accordion right on desktop, stacked on mobile.
export function VideoLibrary({ categories }: { categories: VideoCategory[] }) {
  const all = categories.flatMap((c) => c.videos);
  const [selected, setSelected] = useState<VideoItem>(all[0]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(categories.length ? [categories[0].category] : [])
  );

  function toggleCategory(category: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  if (!all.length) return null;

  return (
    <div className="flex flex-col md:flex-row border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-lg bg-white md:items-stretch">
      {/* Main portrait player */}
      <div className="flex flex-col items-center p-4 md:p-6 md:flex-shrink-0 bg-white">
        <div className="relative w-full max-w-[300px] aspect-[9/16] rounded-xl overflow-hidden bg-[#0F1D2F]">
          <video
            key={selected.id}
            controls
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            src={selected.url}
          />
        </div>
        <div className="mt-3 w-full max-w-[300px] rounded-lg bg-[#0F1D2F] px-4 py-3">
          <p className="text-white font-semibold text-sm leading-snug text-center">{selected.title}</p>
        </div>
      </div>

      {/* Accordion category sidebar */}
      <div className="w-full md:flex-1 border-t border-[#E2E8F0] md:border-t-0 md:border-l overflow-y-auto max-h-80 md:max-h-[560px]">
        {categories.map((group) => {
          const isOpen = openCategories.has(group.category);
          return (
            <div key={group.category}>
              <button
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#F5F7FA] border-b border-[#E2E8F0] hover:bg-[#EDF0F5] transition-colors"
              >
                <p className="text-left text-xs font-bold text-[#5A6B7D] uppercase tracking-widest">
                  {group.category}
                </p>
                <ChevronDown
                  className={`h-4 w-4 text-[#5A6B7D] transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen &&
                group.videos.map((video) => {
                  const active = selected.id === video.id;
                  return (
                    <button
                      key={video.id}
                      onClick={() => setSelected(video)}
                      className={`w-full flex items-start gap-3 py-3 text-left border-b border-[#E2E8F0] transition-colors ${
                        active ? "bg-[#EFF6FF] pl-3 border-l-4 border-l-[#2196F3]" : "hover:bg-[#F5F7FA] pl-4"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center ${
                          active ? "bg-[#2196F3]" : "bg-[#E2E8F0]"
                        }`}
                      >
                        <Play className={`h-3 w-3 ${active ? "text-white" : "text-[#5A6B7D]"}`} fill="currentColor" />
                      </div>
                      <span
                        className={`text-sm leading-snug pr-3 ${
                          active ? "text-[#0F1D2F] font-medium" : "text-[#5A6B7D]"
                        }`}
                      >
                        {video.title}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

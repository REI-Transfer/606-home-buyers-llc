"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Brand } from "@/lib/brand";

const titles = [
  "Our Offer Never Changes.",
  "No Inspection Tricks.",
  "A Fair Cash Offer.",
];

const descriptionText = "Most cash buyers quote high to get you locked in. Then they send someone to inspect the property and chip away at the number. By the time they are done adjusting, the offer barely resembles what they promised. We do our homework first. The number we give you is the number you get at closing. Every single time.";

export function PhilosophySection({ brand }: { brand: Brand }) {
  void brand;
  const sectionRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [titleOpacity, setTitleOpacity] = useState(0);
  const [descriptionProgress, setDescriptionProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const updateTransforms = useCallback(() => {
    if (!sectionRef.current) return;

    const rect = sectionRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const sectionHeight = sectionRef.current.offsetHeight;

    const scrollableRange = sectionHeight - windowHeight;
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableRange));

    setTitleOpacity(progress);

    if (descriptionRef.current) {
      const descRect = descriptionRef.current.getBoundingClientRect();
      const descTop = descRect.top;

      const startTrigger = windowHeight * 0.8;
      const endTrigger = windowHeight * 0.2;

      if (descTop < startTrigger && descTop > endTrigger - descRect.height) {
        const descProgress = Math.max(0, Math.min(1, (startTrigger - descTop) / (startTrigger - endTrigger)));
        setDescriptionProgress(descProgress);
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTransforms);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateTransforms();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateTransforms]);

  return (
    <section id="promise" className="bg-background">
      <div ref={sectionRef} className="relative" style={{ height: "150vh" }}>
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-7xl px-4">
            <div
              className="flex items-center justify-center pointer-events-none"
              style={{ perspective: '1000px' }}
            >
              <div className="relative w-full" style={{ transformStyle: 'preserve-3d', minHeight: '150px' }}>
                {titles.map((title, index) => {
                  const isLastText = index === titles.length - 1;
                  const segmentSize = 1 / titles.length;
                  const startProgress = index * segmentSize;
                  const endProgress = (index + 1) * segmentSize;

                  let rotateX = 0;
                  let opacity = 0;

                  if (titleOpacity >= startProgress && titleOpacity < endProgress) {
                    const localProgress = (titleOpacity - startProgress) / segmentSize;
                    rotateX = (1 - localProgress) * 90;
                    opacity = localProgress;
                  } else if (titleOpacity >= endProgress) {
                    if (isLastText) { rotateX = 0; opacity = 1; }
                    else { rotateX = -90; opacity = 0; }
                  } else {
                    rotateX = 90;
                    opacity = 0;
                  }

                  return (
                    <h2
                      key={index}
                      className="absolute inset-0 flex items-center justify-center text-[8vw] sm:text-[7vw] font-bold leading-tight tracking-tighter text-[#0F1D2F] md:text-[6vw] lg:text-[5vw] text-center px-4"
                      style={{
                        transform: `rotateX(${rotateX}deg) translateZ(0)`,
                        opacity,
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        willChange: 'transform, opacity',
                      }}
                    >
                      {title}
                    </h2>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={descriptionRef} className="px-6 pt-8 pb-20 md:px-12 md:pt-12 md:pb-28 lg:px-20 lg:pt-16 lg:pb-36">
        <div className="text-center max-w-4xl mx-auto">
          <p className="mt-8 leading-relaxed text-muted-foreground text-2xl md:text-3xl text-center">
            {descriptionText.split(" ").map((word, index, array) => {
              const wordProgress = Math.max(0, Math.min(1, (descriptionProgress * array.length) - index));
              const opacity = wordProgress;
              const blur = (1 - wordProgress) * 40;

              return (
                <span
                  key={index}
                  style={{
                    opacity,
                    filter: `blur(${blur}px)`,
                    transition: 'opacity 0.3s ease, filter 0.3s ease',
                  }}
                >
                  {word}{index < array.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

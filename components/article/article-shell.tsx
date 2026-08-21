import Image from "next/image"
import Link from "next/link"
import config from "@/lib/config"
import { StickyContactBar } from "./sticky-contact-bar"
import { MoreArticles } from "./more-articles"

// Reusable editorial wrapper so every awareness article matches the main advertorial.
interface ArticleShellProps {
  label?: string
  title: string
  dek?: string
  writerName?: string
  writerRole?: string
  writerHeadshot?: string
  companyName: string
  children: React.ReactNode
}

export function ArticleShell({
  label = "Advertorial",
  title,
  dek,
  writerName = "The Editorial Team",
  writerRole = "Homeowner Resources",
  writerHeadshot = "/images/adv-local-team.jpg",
  companyName,
  children,
}: ArticleShellProps) {
  return (
    <div className="bg-white text-[#1a1a1a] pb-24">
      <article className="mx-auto max-w-[760px] px-6 pt-10 pb-16 text-[18px] md:text-[19px] leading-[1.65]">
        <p className="text-xs tracking-[0.14em] uppercase text-center text-[#6b6b6b] mb-[18px]">
          {label}
        </p>
        <header>
          <h1 className="text-[28px] md:text-[36px] leading-[1.18] font-extrabold text-center mb-[18px] tracking-[-0.01em]">
            {title}
          </h1>
          {dek && <p className="text-center text-[18px] text-[#333] mb-[26px]">{dek}</p>}
          <div className="flex items-center gap-3 py-3 mb-[30px] border-y border-[#e5e5e5]">
            <Image
              src={writerHeadshot}
              alt={writerName}
              width={46}
              height={46}
              className="h-[46px] w-[46px] rounded-full object-cover bg-gray-200"
            />
            <div>
              <div className="text-[15px] font-semibold">By {writerName}</div>
              <div className="text-[13px] text-[#6b6b6b]">{writerRole} · Updated this week</div>
            </div>
          </div>
        </header>

        {children}

        <footer className="mt-12 pt-6 border-t border-[#e5e5e5] text-[13px] text-[#6b6b6b] text-center">
          <p className="mb-2">
            This is an advertorial. {companyName} is a real estate investment company, not a
            licensed brokerage. Cash offers depend on property condition, location, and market
            value. No offer is guaranteed until presented in writing. No cost, no obligation.
          </p>
          <p>
            <Link href="/privacy" className="text-[#1a4d8f] underline">Privacy</Link>
            {" · "}
            <Link href="/terms" className="text-[#1a4d8f] underline">Terms</Link>
          </p>
        </footer>
      </article>

      {/* Keep-reading loop: links to the next articles so content never dead-ends. */}
      <MoreArticles />

      {/* Sticky text/call CTA that follows the reader as they scroll. */}
      <StickyContactBar
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        smsKeyword={config.smsKeyword}
      />
    </div>
  )
}

// Small prose helpers so article pages stay readable.
export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[22px] md:text-[28px] leading-[1.25] font-extrabold mt-[44px] mb-[20px] tracking-[-0.005em]">
      {children}
    </h2>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-[18px]">{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mb-[18px] pl-[22px] list-disc space-y-2">{children}</ul>
}

// Full-width editorial image with optional caption, matching the main advertorial.
export function ArticleImage({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption?: string
}) {
  return (
    <figure className="my-[8px] mb-[30px]">
      <Image
        src={src}
        alt={alt}
        width={760}
        height={500}
        className="block w-full h-auto rounded-[3px] bg-gray-100"
      />
      {caption && (
        <figcaption className="mt-2 text-[13px] text-[#6b6b6b] text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

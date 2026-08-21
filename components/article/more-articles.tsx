"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ARTICLES } from "@/lib/articles"

// "Keep reading" loop shown at the bottom of every advertorial. It finds the current
// article by pathname and surfaces the NEXT few in the library, wrapping around so the
// reader always has somewhere to go. That turns the articles into a continuous loop of
// content to consume.

const HOW_MANY = 3

export function MoreArticles() {
  const pathname = usePathname()
  const idx = ARTICLES.findIndex((a) => a.slug === pathname)

  // If we cannot match the current page, just show the first few.
  const start = idx === -1 ? 0 : idx + 1
  const next = Array.from({ length: HOW_MANY }, (_, i) => ARTICLES[(start + i) % ARTICLES.length])

  return (
    <section className="border-t border-[#e5e5e5] bg-[#fafafa]">
      <div className="mx-auto max-w-[760px] px-6 py-12">
        <h2 className="text-[22px] md:text-[26px] font-extrabold text-center mb-2 tracking-[-0.005em]">
          Keep reading
        </h2>
        <p className="text-center text-[15px] text-[#6b6b6b] mb-7">
          A few more honest answers before you decide.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {next.map((a) => (
            <Link
              key={a.slug}
              href={a.slug}
              className="group flex flex-col sm:flex-row overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white transition-colors hover:border-[#1a4d8f] hover:bg-[#f5f9ff] no-underline"
            >
              <Image
                src={a.image}
                alt={a.title}
                width={220}
                height={150}
                className="h-[150px] w-full sm:h-auto sm:w-[170px] shrink-0 object-cover bg-gray-100"
              />
              <div className="p-5">
                <h3 className="text-[17px] md:text-[19px] leading-[1.3] font-extrabold text-[#1a1a1a] mb-1">
                  {a.title}
                </h3>
                <p className="text-[14px] text-[#555] mb-2">{a.teaser}</p>
                <span className="text-[14px] font-semibold text-[#1a4d8f]">Read the article →</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/articles" className="text-[15px] font-semibold text-[#1a4d8f] underline">
            See all articles
          </Link>
        </div>
      </div>
    </section>
  )
}

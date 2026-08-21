"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { SurveyCard } from "@/components/survey/survey-card"
import { AddressAutocomplete, type AddressDetails, type ServiceArea } from "@/components/survey/address-autocomplete"

// Shared v2 "equity-opportunity" advertorial for the rei-survey-template repo (serves Express,
// Pathway, Pure Growth, etc. via per-project env). MARKET-NEUTRAL and config-driven: every brand,
// owner, market, and phone comes from server props, so each project renders its own. Family B survey
// card: seed with initialAddress + initialStep (no companyName prop). Sticky top bar opens a popup at
// step 2. ALL inline + bottom CTAs open the popup (setModalOpen). No fake urgency, no countdowns.

interface AdvertorialPageProps {
  companyName: string
  phoneDisplay: string
  phoneHref: string
  marketName: string
  accentColor: string
  ownerName?: string
  headshotUrl?: string
  serviceAreas: ServiceArea[]
  // 2-letter US state codes to ALLOW (ALLOWED_STATES). Empty → no state gate.
  // Must reach the sticky-bar AddressAutocomplete too: it seeds the modal at
  // step 2, which skips SurveyCard's step-1 out-of-area check.
  allowedStates?: string[]
  // Forwarded to SurveyCard so the advertorial funnel honors MOTIVATION_V2 too.
  motivationV2?: boolean
}

export function AdvertorialPage({
  companyName,
  phoneDisplay,
  phoneHref,
  marketName,
  accentColor,
  ownerName,
  headshotUrl,
  serviceAreas,
  allowedStates = [],
  motivationV2 = false,
}: AdvertorialPageProps) {
  const market = marketName || "your area"
  const where = market === "your area" ? "the areas we serve" : market
  const writerName = ownerName || `The ${companyName} Team`
  const writerRole = `${companyName}${marketName ? ` · ${marketName}` : ""}`
  const writerHeadshot = headshotUrl || "/images/adv-local-team.jpg"

  const C = {
    text: "#1a1a1a",
    muted: "#6b6b6b",
    link: accentColor,
    rule: "#e5e5e5",
    cta: "#1f8a4c",
    accent: accentColor,
    warn: "#c0392b",
  }

  const formRef = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)
  const [stickyAddr, setStickyAddr] = useState("")
  const [seeded, setSeeded] = useState<{ address: string; state: string; city: string; county: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 600
      const form = formRef.current
      let formVisible = false
      if (form) {
        const r = form.getBoundingClientRect()
        formVisible = r.top < window.innerHeight && r.bottom > 0
      }
      setShowSticky(scrolled && !formVisible)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleStickySelect = (address: string, details: AddressDetails) => {
    setSeeded({ address, state: details.state || "", city: details.city || "", county: details.county || "" })
    setModalOpen(true)
  }
  const openModalFromButton = () => {
    if (!seeded && stickyAddr.trim()) setSeeded({ address: stickyAddr.trim(), state: "", city: "", county: "" })
    setModalOpen(true)
  }

  const Cta = ({ label }: { label: string }) => (
    <div className="my-[36px] flex justify-center">
      <button onClick={() => setModalOpen(true)} style={{ background: C.cta }} className="w-full max-w-[540px] text-white font-extrabold text-[18px] md:text-[20px] text-center px-6 py-[19px] rounded-[40px] hover:opacity-95 transition-opacity shadow-sm">
        {label}
      </button>
    </div>
  )

  return (
    <div style={{ color: C.text, background: "#fff" }}>
      <article className="mx-auto max-w-[760px] px-6 pt-6 md:pt-10 pb-36 text-[18px] md:text-[19px] leading-[1.7]">
        <p style={{ color: C.muted }} className="text-xs tracking-[0.14em] uppercase text-center mb-[12px]">Advertorial</p>

        <header>
          <h1 className="text-[24px] md:text-[34px] leading-[1.18] font-extrabold text-center mb-[12px] tracking-[-0.01em]">
            {market === "your area" ? "" : `${market} `}Homeowners 45+: A Buyer Criteria Most Sellers Overlook Is Pushing Higher Cash Offers On Older Homes.
          </h1>
          <p className="text-center text-[17px] md:text-[20px] font-semibold mb-[10px] leading-[1.4]">
            See Your 24-Hour Cash Offer Estimate Without Listing, Repairs, Or Showings.
          </p>
          <p style={{ color: C.muted }} className="text-center text-[15px] mb-[18px] leading-[1.45]">
            Best for dated or inherited homes that need work, and owners who want speed and certainty.
          </p>

          <div style={{ borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}` }} className="flex items-center gap-3 py-3 mb-[22px]">
            <Image src={writerHeadshot} alt={writerName} width={46} height={46} unoptimized className="h-[46px] w-[46px] rounded-full object-cover bg-gray-200" />
            <div>
              <div className="text-[15px] font-semibold">By {writerName}</div>
              <div style={{ color: C.muted }} className="text-[13px]">{writerRole} · Updated this week</div>
            </div>
          </div>
        </header>

        <figure className="my-[8px] mb-[30px]">
          <Image src="/images/adv-strangers-open-house.jpg" alt="Unfamiliar visitors walking through a home during an open house showing" width={760} height={500} className="block w-full h-auto rounded-[3px] bg-gray-100" priority />
          <figcaption style={{ color: C.muted }} className="text-[13px] text-center mt-2 italic">
            An open house hands your living room over to strangers for weeks. A growing number of homeowners are quietly opting out of that whole routine.
          </figcaption>
        </figure>

        {/* Proof + credibility strip, right under the hero. */}
        <div style={{ border: `1px solid ${C.rule}` }} className="rounded-[10px] px-4 py-3.5 mb-[30px] flex items-start gap-3">
          <Image src="/images/adv-testimonial-1.jpg" alt="" width={44} height={44} className="w-[44px] h-[44px] rounded-full object-cover shrink-0 bg-gray-100" />
          <div>
            <div style={{ color: "#f5a623" }} className="text-[13px] tracking-[1px] leading-none mb-1">★★★★★</div>
            <p className="text-[14px] leading-[1.45] mb-1">{`"We sold the house exactly as it stood and wrapped up in under two weeks. Not a single repair on us." `}<cite style={{ color: C.muted }} className="not-italic">Diane R., Akron OH</cite></p>
            <p style={{ color: C.muted }} className="text-[12.5px] leading-[1.4]">A local, BBB-accredited {where} cash buyer. Real written offers, no obligation.</p>
          </div>
        </div>

        {/* Equity-opportunity opening, texting-style short lines, softened market claim. */}
        <section>
          <p className="mb-[14px]">Here is a number most owners past 45 never sit down and tally.</p>
          <p className="mb-[14px]"><strong>You have spent years chipping away at this home while values around you kept climbing.</strong></p>
          <p className="mb-[14px]">That patience quietly built something real. Equity. Often a good deal more of it than people guess.</p>
          <p className="mb-[14px]">But equity does nothing for you while it sits trapped in the drywall.</p>
          <p className="mb-[14px]">It cannot fund the move. It cannot help your kids. It cannot lift one ounce of worry off your retirement.</p>
          <p className="mb-[14px]">It only goes to work the moment you turn it into cash in hand.</p>
          <p className="mb-[14px]">Nobody can promise next year mirrors this one. Meanwhile the property taxes, the insurance premiums, and the upkeep on an aging home have not gotten any gentler.</p>
          <p className="mb-[14px]"><strong>So the question that actually matters is not what you might list it for one day. It is what you can walk away with, and how soon.</strong></p>
        </section>

        {/* Mechanism preview box + first hard ask. */}
        <aside style={{ border: `1px solid ${C.rule}`, background: "#fafafa" }} className="rounded-[12px] px-6 py-[26px] my-[34px]">
          <h3 className="text-[20px] md:text-[22px] font-extrabold text-center mb-1.5">Here Is Exactly How Selling To {companyName} Works</h3>
          <p style={{ color: C.muted }} className="text-center text-[15px] mb-5">No riddles, no pressure. Three plain steps.</p>
          <ul className="space-y-3.5">
            <li className="flex gap-3"><span style={{ background: C.accent }} className="shrink-0 w-[28px] h-[28px] rounded-full text-white text-[15px] font-extrabold flex items-center justify-center">1</span><span><strong>You tell us about the home.</strong> A few quick questions, roughly 60 seconds. No cost, nothing owed.</span></li>
            <li className="flex gap-3"><span style={{ background: C.accent }} className="shrink-0 w-[28px] h-[28px] rounded-full text-white text-[15px] font-extrabold flex items-center justify-center">2</span><span><strong>We hand you a fair written cash offer.</strong> We weigh the condition, the location, and what comparable homes nearby recently sold for, then show you the plain math behind your number.</span></li>
            <li className="flex gap-3"><span style={{ background: C.accent }} className="shrink-0 w-[28px] h-[28px] rounded-full text-white text-[15px] font-extrabold flex items-center justify-center">3</span><span><strong>You choose the closing day.</strong> No repairs, no showings, no fees. The offer is yours to keep and weigh for as long as you want.</span></li>
          </ul>
        </aside>

        <Cta label="See What My Home Qualifies For →" />

        <H2>The House Grew As The Years Went By</H2>
        <FullImage src="/images/adv-empty-rooms.jpg" alt="Quiet staircase and rooms in a longtime family home that now sit mostly empty" />
        <section>
          <p className="mb-[18px]">This is the part no one really warns you about.</p>
          <p className="mb-[18px]">The square footage never moves. You are the one who shifts. One by one, the rooms you used to fill go silent. The spare bedroom becomes a storage closet. The upstairs turns into a place you visit instead of a place you live.</p>
          <p className="mb-[18px]">And the maintenance never lets up. A home of a certain age always has its hand out. A fresh coat of paint. A new heating and cooling unit. Gutters, yet again, after the next storm rolls through.</p>
          <p className="mb-[18px]">Here is the blunt truth a lot of owners run headfirst into: <strong>fixing it all up just to put it on the market can cost more than the cash you have set aside, and pull more out of you than you care to give.</strong></p>
          <p className="mb-[18px]">So the home waits. The decision waits. And another season quietly slips past.</p>
        </section>

        <H2>What Capturing That Equity The Old Way Quietly Costs You</H2>
        <FullImage src="/images/adv-couple-window.jpg" alt="An older couple standing inside the home they have owned for many years" />
        <section>
          <p className="mb-[18px]">The reflex is to list it. Stick it on the market, chase the top number, pocket the whole thing. For a younger household with the time and the budget to fix it up first, that road can absolutely work, and we will say so plainly.</p>
          <p className="mb-[18px]">But here is what listing quietly does to the very equity you set out to capture. It takes a real bite out of it long before you ever touch a dollar:</p>
          <ul className="mb-[18px] pl-[22px] list-disc">
            <li className="mb-2"><strong>You cover the repairs first.</strong> The agent arrives with a punch list. Paint, flooring, the roof. Money walking out of your account before a single buyer shows up.</li>
            <li className="mb-2"><strong>Strangers roam through your home.</strong> Showings put people you have never met inside your closets while you wait it out somewhere else.</li>
            <li className="mb-2"><strong>You wait. And then you wait longer.</strong> A typical listing can stretch two or three months to closing, sometimes more, and the whole deal can still fall apart at the very end.</li>
            <li className="mb-2"><strong>The fees stack up.</strong> Between commission and closing costs, a thick slice of your price quietly disappears. On many homes that is tens of thousands gone right off the top.</li>
          </ul>
          <p className="mb-[18px]">So listing is not the wrong choice for everyone. <strong>But for a home that needs work and an owner who would rather not run a part-time job for three months, the math and the certainty simply lean a different direction.</strong></p>
        </section>

        <Cta label="See What My Home Qualifies For →" />

        <H2>Why A Cash Sale Is The Best Way To Walk Away With Your Equity</H2>
        <FullImage src="/images/adv-handshake.jpg" alt="A relaxed handshake between a homeowner and a local cash home buyer" />
        <section>
          <p className="mb-[18px]">Over these last several years, more and more homeowners past 45 have set the old listing routine aside in favor of something far simpler.</p>
          <p className="mb-[18px]">They sell straight to a local cash home buyer.</p>
          <p className="mb-[18px]">No repairs. No open houses. No commission shaved off the price. They sell the home exactly as it stands, name the closing date that fits them, and walk off with the equity in their pocket.</p>
          <p className="mb-[18px]">It will not fit everyone. If you have all the time you want, the budget for a full renovation, and the stamina for a three month listing, the traditional route is still sitting right there for you.</p>
          <p className="mb-[18px]">But once you weigh it honestly, for a home that needs work and an owner who wants the money in hand without the wait or the risk, <strong>a clean cash sale is simply the strongest option on the table. You hold onto more of what the home is worth, you keep your privacy, and you stay in charge of the calendar.</strong></p>
        </section>

        <Cta label="See What My Home Qualifies For →" />

        <H2>How We Land On Your Number</H2>
        <section>
          <p className="mb-[14px]">No black box, and no pressure. Your cash offer comes down to three plain pieces:</p>
          <ul className="mb-[18px] pl-[22px] list-disc space-y-2">
            <li><strong>1. Recent nearby sales.</strong> What comparable homes in your {where} neighborhood have genuinely sold for lately.</li>
            <li><strong>2. The work the home needs.</strong> We account honestly for the repairs and updates, so that cost never lands back in your pocket.</li>
            <li><strong>3. Room to take the risk.</strong> A fair margin so we can buy it as-is, carry the home, and resell it down the road.</li>
          </ul>
          <p className="mb-[14px]"><strong>Put plainly: recent sale prices, minus the work it needs, with enough room for us to take it on. We walk you through that math before you ever commit to a thing.</strong></p>
        </section>

        <H2>Your Home Does Not Have To Be The Nicest On The Block</H2>
        <FullImage src="/images/adv-dated-kitchen.jpg" alt="A dated, lived-in kitchen in an older home that has not been updated in years" />
        <section>
          <p className="mb-[18px]">Here is the worry we hear above all others. <em>My home is dated. It needs work. Who is going to want it the way it sits?</em></p>
          <p className="mb-[18px]"><strong>That worry is the exact reason we exist.</strong> We are not hunting for a polished, move-in-ready showpiece. We buy older {where} homes that need work, in whatever shape they are in today. The tired kitchen, the worn carpet, the roof that has seen better days. None of it sends us running.</p>
          <p className="mb-[18px]">A listing punishes a home that needs work. It corners you: sink cash into repairs you will never fully recoup, or sit there absorbing the lowball offers buyers throw at anything short of perfect.</p>
          <p className="mb-[18px]">We do the reverse. We see the home for what it actually is, we account for the work honestly, and we hand you a fair cash number for it just as it stands. <strong>If your home were already flawless, you would have no need for a company like ours. Because it is not, we are exactly who you want standing in your corner.</strong></p>
        </section>

        {/* Traditional vs cash compare table. */}
        <H2>Two Honest Ways To Sell. Side By Side.</H2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-[30px]">
          <div style={{ border: `1px solid ${C.rule}` }} className="rounded-[12px] p-5">
            <h4 className="text-[18px] font-bold text-center mb-3.5" style={{ color: C.muted }}>The Traditional Listing</h4>
            <ul className="space-y-2.5 text-[15px]">
              <li>You pay for repairs before it sells</li>
              <li>Strangers tour your home for weeks</li>
              <li>Two to three months to close, if it holds together</li>
              <li>Commission and closing costs off the top</li>
              <li>The buyer controls the timeline</li>
              <li>It can still collapse at the closing table</li>
            </ul>
          </div>
          <div style={{ border: `2px solid ${C.cta}`, background: "#f4faf6" }} className="rounded-[12px] p-5">
            <h4 className="text-[18px] font-bold text-center mb-3.5" style={{ color: C.cta }}>Selling To {companyName}</h4>
            <ul className="space-y-2.5 text-[15px]">
              <li><strong>Sell as it stands, zero repairs</strong></li>
              <li><strong>No showings, full privacy</strong></li>
              <li><strong>Close in as little as two weeks</strong></li>
              <li><strong>No commission, no closing costs</strong></li>
              <li><strong>You pick the closing date</strong></li>
              <li><strong>A real written offer, not a maybe</strong></li>
            </ul>
          </div>
        </div>

        <Cta label="See What My Home Qualifies For →" />

        <H2>Introducing {companyName}</H2>
        <FullImage src="/images/adv-local-team.jpg" alt={`The local ${companyName} team`} />
        <section>
          <p className="mb-[18px]"><strong>{companyName} is a local company{ownerName && ownerName !== "Our Team" ? `, led by ${ownerName},` : ""} that buys homes straight from homeowners across {where}, with cash, in whatever condition they happen to be in.</strong></p>
          <p className="mb-[18px]">That means no repairs, no clearing out the entire house, no listing, no showings, and no commission carved off your number. You tell us about the place, we take a look, and we put a fair written cash offer in your hands.</p>
          <p className="mb-[18px]">Like the offer? You set the closing date. Want it done in two weeks? Easy. Need 60 days to find your next place and pack at a comfortable pace? That works just as well.</p>
          <p className="mb-[18px]">If the offer is not the right fit, there is no arm-twisting and nothing owed. The written offer is yours to hold onto and mull over for as long as you like.</p>
          <p className="mb-[18px]">It is the plainest, easiest-on-the-nerves way to sell a home you have held for years, shaped for exactly the season of life you are standing in right now.</p>
        </section>

        <H2>Why It Suits This Season Of Life</H2>
        <section>
          <ul className="mb-[18px] pl-[22px] list-disc">
            <li className="mb-2"><strong>Sell as it stands.</strong> Not one repair. Not a single brushstroke of paint. Leave behind anything you would rather not drag along.</li>
            <li className="mb-2"><strong>No showings.</strong> No strangers tramping through your home. No keeping the place spotless week after week.</li>
            <li className="mb-2"><strong>Keep more of your money.</strong> No commission and no closing costs gnawing into your retirement.</li>
            <li className="mb-2"><strong>Move on your own schedule.</strong> Close quickly, or take all the time you need. You hold the calendar, not some buyer.</li>
            <li className="mb-2"><strong>Honest certainty.</strong> A genuine written offer from a genuine local buyer, not a maybe that crumbles at the closing table.</li>
          </ul>
          <p className="mb-[18px]">That is why, once homeowners past 45 watch how this actually runs, so many of them say the very same thing: <em>I wish somebody had told me this was an option years ago.</em></p>
        </section>

        {/* Qualifier / DQ box: condition + timeline, NOT property type. */}
        <aside style={{ border: `1px solid ${C.rule}` }} className="rounded-[12px] px-6 py-[24px] my-[36px]">
          <h3 className="text-[19px] md:text-[21px] font-extrabold text-center mb-2.5">Who This Program Is Built For</h3>
          <p className="mb-4 text-[16px] text-center">We would rather be straight with you than waste your time. Here is exactly who we can, and cannot, help.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="font-bold mb-2" style={{ color: C.cta }}>A strong fit if you:</p>
              <ul className="space-y-1.5 text-[15px] list-disc pl-[20px]">
                <li>Own a home in the {where} area</li>
                <li>Have a home that is dated or needs work</li>
                <li>Want cash in hand, with no repairs or showings</li>
                <li>Would like to choose your own closing date</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-2" style={{ color: C.muted }}>Not the right fit if you:</p>
              <ul className="space-y-1.5 text-[15px] list-disc pl-[20px]">
                <li>Have a home in great shape, with the time and money to list it the traditional way</li>
                <li>Already have the home listed with an agent</li>
                <li>Are not the owner on title</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[14px] text-center" style={{ color: C.muted }}>If you are not a fit, we will tell you honestly. No pressure either way.</p>
        </aside>

        <div ref={formRef} id="offer-form" className="scroll-mt-5 my-10">
          <div className="text-center mb-5">
            <h3 className="text-[24px] md:text-[28px] font-extrabold">Find Out What Your Home Qualifies For</h3>
            <p style={{ color: C.muted }} className="mt-1 text-[15px]">A handful of quick questions. No cost, nothing owed, no arm-twisting.</p>
          </div>
          <div className="flex justify-center">
            <SurveyCard phoneDisplay={phoneDisplay} phoneHref={phoneHref} serviceAreas={serviceAreas} allowedStates={allowedStates} motivationV2={motivationV2} />
          </div>
          <p style={{ color: C.muted }} className="text-center text-[13px] mt-3.5 max-w-[460px] mx-auto leading-[1.5]">
            Your information stays private. We never sell or share it. Requesting an offer is free and carries no obligation.
          </p>
        </div>

        <H2>What Other Homeowners Are Saying</H2>
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-[30px] mb-10">
          {[
            { img: "/images/adv-testimonial-1.jpg", quote: "Once my husband passed, the house was simply more than I could keep up with. The repairs by themselves would have run into the thousands. They took it exactly as it sat. I chose the closing day and never lifted a hammer. Such a weight off my shoulders.", cite: "Diane R., 71 · Akron OH" },
            { img: "/images/adv-testimonial-2.jpg", quote: "We were moving to be closer to our daughter and had no stomach for months of showings at our age. They handed us a fair written offer inside a couple of days and let us close once we were good and ready. Straight shooters, no games.", cite: "Harold and Lynn B., 69 and 67 · Macon GA" },
            { img: "/images/adv-testimonial-3.jpg", quote: "I inherited my mother's home and I live two states away. I could not picture flying back for repairs and open houses. They handled all of it over the phone and by email. Not once did I have to make the trip.", cite: "Marcus T., 58 · Toledo OH" },
            { img: "/images/adv-testimonial-4.jpg", quote: "The agent wanted me to sink thousands into fixing the place up before it ever went on the market. I am on a fixed income, so that was never happening. Selling for cash as it stood just made sense. I kept more in my pocket and slept better that night.", cite: "Eleanor S., 74 · Dayton OH" },
          ].map((t) => (
            <figure key={t.cite} style={{ border: `1px solid ${C.rule}` }} className="m-0 text-[15px] leading-[1.55] rounded-lg p-[18px]">
              <Image src={t.img} alt={t.cite} width={300} height={300} className="w-full h-auto aspect-square object-cover rounded-md mb-3 block bg-gray-100" />
              <div style={{ color: "#f5a623" }} className="tracking-[1px] mb-2">★★★★★</div>
              <p className="mb-2.5">{t.quote}</p>
              <cite style={{ color: C.muted }} className="not-italic text-[13px]">{t.cite}</cite>
            </figure>
          ))}
        </section>

        <H2>Questions Homeowners Ask Us First</H2>
        <section className="my-[30px]">
          {[
            { q: "How fast can you close?", a: "As fast as you like. We put a written offer in your hands within 24 hours, and we can close in as little as two weeks. If you need more time to pack or line up your next place, we close on your timeline. We handle the title work and the paperwork." },
            { q: "Are there any fees or commissions?", a: "No. There are no agent commissions, no listing fees, and no closing costs charged to you. The number we agree on is the number you walk away with." },
            { q: "How do you decide on the offer?", a: `We look at your home's location across ${where}, its current condition, and recent sales of comparable homes nearby. Then we show you the plain math behind the number. No black box. You see how we got there before you ever commit.` },
            { q: "Do I have to make repairs or clean it out?", a: "No. We buy as-is, in any condition. Leave behind whatever you do not want. You fix nothing, stage nothing, and host not a single showing." },
            { q: "What is the catch?", a: `There is not one, and we understand exactly why you ask. ${companyName} is a real local company buying houses across ${where}. The offer is no-obligation and the process stays private. You are welcome to check us through the BBB and our reviews before you sign a thing. And if a cash sale is not your best move, we will tell you so.` },
          ].map((f) => (
            <details key={f.q} style={{ borderBottom: `1px solid ${C.rule}` }} className="py-1">
              <summary className="cursor-pointer list-none py-3.5 text-[17px] md:text-[18px] font-bold flex justify-between items-center gap-3">
                <span>{f.q}</span>
                <span style={{ color: C.accent }} className="text-[22px] leading-none shrink-0">+</span>
              </summary>
              <p style={{ color: "#333" }} className="pb-4 text-[16px] leading-[1.6]">{f.a}</p>
            </details>
          ))}
        </section>

        <Cta label="See What My Home Qualifies For →" />

        <H2>So Here Is The Decision In Front Of You</H2>
        <section>
          <p className="mb-[18px]">There is a reason you have read this far. Somewhere inside, you already sense the house is ready for its next chapter, and so are you.</p>
          <p className="mb-[18px]">You gave that home a lifetime of care. At this point, it ought to be looking after you, not the other way around. The simplest first step is finding out what it qualifies for. That costs you nothing, and it commits you to nothing.</p>
        </section>

        <aside style={{ border: "2px dashed #bdbdbd" }} className="rounded-[10px] px-7 py-[30px] max-w-[600px] mx-auto mt-[40px] text-center">
          <Image src="/images/adv-keys-couple.jpg" alt="Relieved homeowners holding the keys after a cash sale" width={170} height={170} className="w-[170px] h-[170px] object-cover rounded-full mx-auto mb-4 block bg-gray-100" />
          <h4 className="text-[22px] font-bold mb-1.5">{companyName} · Cash Offer Program</h4>
          <p style={{ color: C.accent }} className="text-[26px] font-extrabold mb-2">Get Your Fair Written Cash Offer</p>
          <p className="text-[15px] mb-5">Sell it as it stands. No repairs, no showings, no commission. You name the closing date.</p>
          <p style={{ color: C.muted }} className="text-[14px] mb-[18px] leading-[1.5]">We review a limited number of addresses each week to keep our turnaround quick. If your home is a fit, the sooner we see it, the sooner you have your number.</p>
          <button onClick={() => setModalOpen(true)} style={{ background: C.cta }} className="block w-full text-white font-extrabold text-[17px] text-center px-5 py-[17px] rounded-[40px] hover:opacity-95 transition-opacity">
            See What My Home Qualifies For →
          </button>
          <p className="mt-4 text-[14px]">Prefer to talk it through?<br className="sm:hidden" /> Call us at{" "}
            <a href={`tel:${phoneHref}`} style={{ color: C.accent }} className="font-bold underline underline-offset-2 whitespace-nowrap">{phoneDisplay}</a>
          </p>
        </aside>

        <p style={{ color: C.muted }} className="max-w-[760px] mx-auto mt-10 text-[12px] leading-[1.5] text-center">
          This is an advertorial. {companyName} is a real estate investment company. It is not a licensed real estate brokerage and does not provide brokerage services. Cash offers depend on the condition of the property, its location, and its market value. No offer is binding until it is put in writing. Requesting an offer carries no cost and no obligation. Testimonials describe individual experiences and do not guarantee any particular result.
        </p>
      </article>

      <div
        style={{ borderBottom: `1px solid ${C.rule}`, boxShadow: "0 6px 20px rgba(0,0,0,.10)", transform: showSticky && !modalOpen ? "none" : "translateY(-120%)", transition: "transform .3s ease" }}
        className="fixed left-0 right-0 top-0 z-40 bg-white px-4 py-3"
      >
        <div className="max-w-[760px] mx-auto flex gap-2.5 items-center">
          <label className="hidden sm:block text-[13px] font-bold whitespace-nowrap">Type your address to begin:</label>
          <div className="flex-1 min-w-0">
            <AddressAutocomplete value={stickyAddr} onChange={setStickyAddr} onSelect={handleStickySelect} serviceAreas={serviceAreas} allowedStates={allowedStates} placeholder="Your property address" />
          </div>
          <button onClick={openModalFromButton} style={{ background: C.cta }} className="px-4 sm:px-[18px] py-3 text-white rounded-[9px] text-[14px] sm:text-[15px] font-extrabold whitespace-nowrap hover:opacity-95 transition-opacity">
            See My Cash Offer →
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setModalOpen(false)}>
          <div className="relative w-full max-w-[600px] my-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalOpen(false)} aria-label="Close" className="absolute -top-3 -right-3 z-10 h-9 w-9 rounded-full bg-white text-gray-700 text-xl font-bold shadow-md flex items-center justify-center hover:bg-gray-100">×</button>
            <SurveyCard
              key={seeded?.address || "modal"}
              phoneDisplay={phoneDisplay}
              phoneHref={phoneHref}
              serviceAreas={serviceAreas}
              allowedStates={allowedStates}
              initialAddress={seeded?.address}
              initialStep={seeded && seeded.state ? 2 : undefined}
              motivationV2={motivationV2}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[23px] md:text-[30px] leading-[1.22] font-extrabold text-center my-[52px] mb-[26px] tracking-[-0.005em]">{children}</h2>
  )
}

function FullImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-[8px] mb-[30px]">
      <Image src={src} alt={alt} width={760} height={500} className="block w-full h-auto rounded-[3px] bg-gray-100" />
    </figure>
  )
}

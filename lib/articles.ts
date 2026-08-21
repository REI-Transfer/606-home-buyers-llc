// Single source of truth for the advertorial article library.
// Used by the /articles index and the "keep reading" loop at the bottom of every article.

export interface ArticleMeta {
  slug: string // full path, e.g. "/articles/whats-the-catch"
  title: string
  teaser: string
  image: string
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: "/articles/what-happens-next",
    title:
      "What Really Happens After You Request a Cash Offer (A Calm Walk-Through for Homeowners)",
    teaser:
      "A simple, step-by-step look at the whole process, so there are no surprises and no pressure.",
    image: "/images/adv-keys-couple.jpg",
  },
  {
    slug: "/articles/the-truth-about-lowball-offers",
    title:
      "The Truth About 'Lowball' Cash Offers, From the People Who Actually Make Them",
    teaser:
      "How a fair cash offer is really put together, and why the money you keep matters more than the sticker price.",
    image: "/images/adv-handshake.jpg",
  },
  {
    slug: "/articles/real-buyer-vs-tire-kicker",
    title:
      "How to Tell a Serious Cash Home Buyer From a Tire-Kicker in About Five Minutes",
    teaser:
      "A simple checklist to vet any cash buyer and protect yourself before you sign a thing.",
    image: "/images/adv-local-team.jpg",
  },
  {
    slug: "/articles/cash-offer-vs-agent",
    title:
      "Cash Offer or List With an Agent? An Honest Look at What You Actually Walk Away With",
    teaser:
      "A fair side-by-side of both routes, so you choose the one that fits your home and your life.",
    image: "/images/adv-strangers-open-house.jpg",
  },
  {
    slug: "/articles/whats-the-catch",
    title:
      "What Is the Catch With a Cash Offer? An Honest Look at Why It Sounds Too Good to Be True",
    teaser:
      "No repairs, no fees, no showings. Here is where the money actually comes from, and the real trade-off.",
    image: "/images/adv-couple-kitchen.jpg",
  },
  {
    slug: "/articles/fix-up-before-selling",
    title:
      "Should You Fix Up Your House Before Selling It? The Math Most Homeowners Get Wrong",
    teaser:
      "The instinct is to renovate first. Here is why fixing up often costs more than it earns back.",
    image: "/images/adv-homeowner-repair.jpg",
  },
  {
    slug: "/articles/real-cash-buyer-vs-scam",
    title:
      "How to Tell a Real Cash Buyer From a Scam: Five Questions That Expose the Difference",
    teaser:
      "Five plain questions any honest buyer will answer without flinching, so you can protect yourself.",
    image: "/images/adv-phone-vetting.jpg",
  },
  {
    slug: "/articles/wait-for-better-market",
    title:
      "Is Now a Bad Time to Sell? Why Waiting for a Better Market Can Quietly Cost You",
    teaser:
      "Holding out for a higher price feels patient. Here is the price tag the waiting itself carries.",
    image: "/images/adv-couple-window.jpg",
  },
  {
    slug: "/articles/sell-it-yourself",
    title:
      "Why Not Just Sell It Yourself and Skip the Middleman? The Hidden Cost of Going It Alone",
    teaser:
      "Selling on your own sounds like keeping every dollar. Here is what it really takes, and where it goes sideways.",
    image: "/images/adv-paperwork-alone.jpg",
  },
]

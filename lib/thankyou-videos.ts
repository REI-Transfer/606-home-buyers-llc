// Thank-you follow-up videos, grouped by subdivision. Data-driven (replaces the
// old per-video env pairs) so we can render N videos under section headers.
export type ThankYouVideo = { url: string; title: string };
export type ThankYouGroup = { heading: string; videos: ThankYouVideo[] };

const B = "https://2ckh3rtqkymeb4q5.public.blob.vercel-storage.com/606%20Home%20Buyers%20";

// Hero (top) video shown at the top of the thank-you page.
export const HERO_VIDEO: ThankYouVideo = {
  url: `${B}1.mp4`,
  title: "Welcome \u2014 Who We Are",
};

// Follow-up "While You Wait" videos, grouped by subdivision.
export const THANKYOU_GROUPS: ThankYouGroup[] = [
  {
    heading: "What Happens Next",
    videos: [{ url: `${B}4.mp4`, title: "You're Booked \u2014 What Happens Now" }],
  },
  {
    heading: "How Our Offers Work",
    videos: [
      { url: `${B}2.mp4`, title: "How We Estimate Your Offer" },
      { url: `${B}5.mp4`, title: "Cash Offer vs. Listing With an Agent" },
      { url: `${B}9.mp4`, title: "Why We Don't Buy Every House" },
    ],
  },
  {
    heading: "Before Your Call",
    videos: [
      { url: `${B}6.mp4`, title: "3 Ways to Make Your Call Go Smoother" },
      { url: `${B}3.mp4`, title: "Zero Pressure, Zero Obligation" },
    ],
  },
  {
    heading: "Real Stories",
    videos: [{ url: `${B}7.mp4`, title: "3 Stories From Us" }],
  },
];

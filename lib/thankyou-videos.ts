// Thank-you video library, grouped into accordion categories. Data-driven so the
// VideoLibrary component (main player + accordion) renders N vertical videos.
export interface VideoItem { id: string; title: string; url: string }
export interface VideoCategory { category: string; videos: VideoItem[] }

const B = "https://2ckh3rtqkymeb4q5.public.blob.vercel-storage.com/606%20Home%20Buyers%20";

export const VIDEO_LIBRARY: VideoCategory[] = [
  {
    category: "Start Here",
    videos: [
      { id: "v1", title: "Welcome \u2014 Who We Are", url: `${B}1.mp4` },
      { id: "v4", title: "You're Booked \u2014 What Happens Now", url: `${B}4.mp4` },
    ],
  },
  {
    category: "How Our Offers Work",
    videos: [
      { id: "v2", title: "How We Estimate Your Offer", url: `${B}2.mp4` },
      { id: "v5", title: "Cash Offer vs. Listing With an Agent", url: `${B}5.mp4` },
      { id: "v9", title: "Why We Don't Buy Every House", url: `${B}9.mp4` },
    ],
  },
  {
    category: "Before Your Call",
    videos: [
      { id: "v6", title: "3 Ways to Make Your Call Go Smoother", url: `${B}6.mp4` },
      { id: "v3", title: "Zero Pressure, Zero Obligation", url: `${B}3.mp4` },
    ],
  },
  {
    category: "Real Stories",
    videos: [
      { id: "v7", title: "3 Stories From Us", url: `${B}7.mp4` },
    ],
  },
];

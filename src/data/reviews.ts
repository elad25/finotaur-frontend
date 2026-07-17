// src/data/reviews.ts
// ================================================
// PUBLIC REVIEWS — single source of truth
// ================================================
// This is the ONLY data module the public /reviews page (and any other
// public-facing surface that wants to show member reviews) should read
// from. The entries below are copied verbatim from the existing
// testimonials in `src/components/landing-new/Testimonials.tsx` — same
// name, role, avatar, text, and highlight. No ratings or star data exist
// here on purpose: we have no numeric rating data, so none is fabricated.
//
// New entries must be REAL, user-approved quotes only. Do not invent or
// paraphrase reviews — if a new one is added, it must come from an actual
// Finotaur member who has agreed to have their quote published.

export interface PublicReview {
  id: string;
  name: string;
  role: string;
  avatar: string;
  text: string;
  highlight: string;
}

export const PUBLIC_REVIEWS: PublicReview[] = [
  {
    id: "1",
    name: "James Kim",
    role: "Swing Trader",
    avatar: "JK",
    text: "The writing quality and depth of analysis here is something I haven't found anywhere else. It's like getting a CFA breakdown in every report. Finotaur changed how I approach markets completely.",
    highlight: "something I haven't found anywhere else",
  },
  {
    id: "2",
    name: "Rachel Green",
    role: "Options Trader",
    avatar: "RG",
    text: "As someone who traded blindly for years, Finotaur is like someone turned on the lights in a dark room. The AI insights plus Top Secret every morning — I can't imagine trading without it now.",
    highlight: "turned on the lights in a dark room",
  },
  {
    id: "3",
    name: "Alex Thompson",
    role: "Day Trader",
    avatar: "AT",
    text: "I started with the 14-day free trial and canceled all my other subscriptions. The AI analyzer alone is worth 10x the price. TOP SECRET reports are institutional-grade. This is the real deal.",
    highlight: "canceled all my other subscriptions",
  },
  {
    id: "4",
    name: "David Chen",
    role: "Funded Account Manager",
    avatar: "DC",
    text: "Finotaur showed me I was overtrading Mondays by 3x. Fixing that one pattern reshaped how I trade. The AI insights are legitimately game-changing.",
    highlight: "legitimately game-changing",
  },
  {
    id: "5",
    name: "Sarah Mitchell",
    role: "Portfolio Manager",
    avatar: "SM",
    text: "Finally someone who understands I don't need more data, I need conclusions. These briefings save me hours every day. The best investment I made this year.",
    highlight: "save me hours every day",
  },
  {
    id: "6",
    name: "Michael Rodriguez",
    role: "Prop Trader",
    avatar: "MR",
    text: "I pay thousands per month for research subscriptions. Finotaur beats them all in value-for-money. The macro analysis here is better than anything I got from terminals costing thousands a month.",
    highlight: "beats them all in value-for-money",
  },
];

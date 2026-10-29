// Everything that defines the product lives here: name, prices, areas, categories.
// Rename the site or change pricing in one place.

export const SITE = {
  name: "WhatsOnTapovan",
  place: "Rishikesh",
  tagline: "Every flyer in Tapovan, on one wall.",
  description:
    "What's on tonight in Tapovan, Rishikesh: live music, ecstatic dance, sound healing, kirtan, workshops and more. Every flyer in one place, filterable by date, price and area.",
  // On Vercel without SITE_URL, its production domain (QR posters, emails and calendar links need the real address).
  url:
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  timeZone: "Asia/Kolkata",
  // Map default view: Tapovan, between Upper Tapovan and Laxman Jhula.
  mapCenter: [30.1302, 78.3228] as [number, number],
  mapZoom: 15,
};

export const LISTING = {
  pricePaise: Number(process.env.LISTING_PRICE_PAISE || 5000), // ₹50
  days: Number(process.env.LISTING_DAYS || 28), // 4 weeks
};

export const rupees = (paise: number) => `₹${Math.round(paise / 100)}`;

export const AREAS = [
  { key: "upper-tapovan", label: "Upper Tapovan" },
  { key: "lower-tapovan", label: "Lower Tapovan" },
  { key: "laxman-jhula", label: "Laxman Jhula" },
  { key: "ram-jhula", label: "Ram Jhula & Swarg Ashram" },
  { key: "other", label: "Elsewhere nearby" },
] as const;
export type AreaKey = (typeof AREAS)[number]["key"];

// Colours are used for map pins and category chips.
export const CATEGORIES = [
  { key: "music", label: "Live music & jams", short: "Music", color: "#d9480f" },
  { key: "dance", label: "Ecstatic, classical & folk dance", short: "Dance", color: "#c2255c" },
  { key: "sound", label: "Sound healing", short: "Sound", color: "#7048e8" },
  { key: "kirtan", label: "Kirtan & mantra", short: "Kirtan", color: "#e67700" },
  { key: "ceremony", label: "Cacao & ceremony", short: "Ceremony", color: "#8d5524" },
  { key: "yoga", label: "Yoga & breathwork", short: "Yoga", color: "#0b7285" },
  { key: "fitness", label: "Martial arts & fitness", short: "Fitness", color: "#5c940d" },
  { key: "talk", label: "Satsang, talks & meditation", short: "Talks", color: "#5c7cfa" },
  { key: "comedy", label: "Open mic & comedy", short: "Open mic", color: "#f08c00" },
  { key: "party", label: "Parties & DJ nights", short: "Party", color: "#ae3ec9" },
  { key: "market", label: "Festivals, markets & pop-ups", short: "Festivals", color: "#2b8a3e" },
  { key: "film", label: "Film, art & culture", short: "Culture", color: "#495057" },
  { key: "course", label: "Courses & retreats", short: "Courses", color: "#1971c2" },
  { key: "other", label: "Something else", short: "Other", color: "#868e96" },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export function category(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
export function area(key: string) {
  return AREAS.find((a) => a.key === key) ?? AREAS[AREAS.length - 1];
}

export const WHEN_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "tonight", label: "Tonight" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend", label: "This weekend" },
  { key: "week", label: "Next 7 days" },
  { key: "all", label: "All upcoming" },
] as const;

/** "Tonight" starts at 6pm: anything starting then or later, or still running at 6pm. */
export const TONIGHT_FROM = "18:00";

/** The kinds people come to Tapovan to practise, behind the one-tap "Practice" chip. */
export const PRACTICE = ["yoga", "talk", "sound", "kirtan", "ceremony"] as const;

/** Kinds of flyer whose named people are musicians: the Musicians page lists only them, not class teachers. */
export const MUSIC = ["music", "kirtan", "party"] as const;

/** Day bands for "today" lists, named the way a practising day runs. Devanagari label first. */
export const DAY_BANDS = [
  { key: "morning", hi: "सुबह", label: "Morning practice", to: "11:59" },
  { key: "afternoon", hi: "दोपहर", label: "Afternoon", to: "16:59" },
  { key: "evening", hi: "शाम", label: "Sunset and aarti", to: "18:14" },
  { key: "night", hi: "रात", label: "Night", to: "23:59" },
] as const;

export const TIME_OPTIONS = [
  { key: "morning", label: "Morning", from: "00:00", to: "11:59" },
  { key: "afternoon", label: "Afternoon", from: "12:00", to: "16:59" },
  { key: "evening", label: "Evening", from: "17:00", to: "20:59" },
  { key: "night", label: "Late night", from: "21:00", to: "23:59" },
] as const;

export const PRICE_OPTIONS = [
  { key: "free", label: "Free / donation" },
  { key: "u500", label: "Under ₹500" },
  { key: "u1000", label: "Under ₹1000" },
] as const;

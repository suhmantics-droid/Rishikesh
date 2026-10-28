// Starting directory of Tapovan venues known for events. Pins are APPROXIMATE
// (coords_verified = 0) — fix each one from /admin/venues by clicking the map.
// Organisers can also add new venues when they post a flyer.

export type SeedVenue = {
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  address: string;
  description: string;
  /** The pin was taken from the place's own Google Maps listing. */
  coords_verified?: boolean;
  /** Recommended places, highest first (true = 1). */
  recommended?: boolean | number;
  /** What the place is, in a few words: "Yoga school". */
  kind?: string;
  website?: string;
  instagram?: string;
  /** A place to stay (hostel, guesthouse): its own layer on the map. */
  stay?: boolean;
  google_url?: string;
  google_rating?: number;
  google_reviews?: number;
  google_checked?: string;
};

export const VENUE_SEED: SeedVenue[] = [
  // Recommended. Pins, ratings and review counts from each place's Google Maps listing, checked on the date given.
  {
    slug: "yog-upasana",
    name: "Yog Upasana",
    area: "upper-tapovan",
    lat: 30.132054,
    lng: 78.3202483,
    coords_verified: true,
    address: "Balaknath Road, Tapovan",
    description: "Traditional hatha yoga, taught with care for alignment. Drop-in classes and teacher training.",
    recommended: 2,
    kind: "Yoga school",
    google_url: "https://www.google.com/maps/place/Yog+Upasana/@30.132054,78.3202483,17z",
    google_rating: 4.7,
    google_reviews: 181,
    google_checked: "2026-10-27",
  },
  {
    slug: "samedhya",
    name: "Samedhya Wellbeing Center",
    area: "upper-tapovan",
    lat: 30.1305228,
    lng: 78.3197123,
    coords_verified: true,
    address: "Inside Secret Garden Cafe, Upper Tapovan",
    description: "Ayurvedic healing and wellbeing centre. Women-owned.",
    recommended: true,
    kind: "Ayurvedic centre",
    instagram: "samedhya",
    website: "https://www.samedhyawellness.com",
    google_url: "https://www.google.com/maps/place/SAMEDHYA+WELLBEING+CENTER/@30.1305228,78.3197123,17z",
    google_rating: 5.0,
    google_reviews: 85,
    google_checked: "2026-10-27",
  },
  // Places to stay: well-reviewed hostels in Tapovan, from their Google Maps listings (descriptions are Google's summaries).
  {
    slug: "the-hosteller-upper-tapovan",
    instagram: "thehosteller",
    website: "https://www.thehosteller.com",
    name: "The Hosteller",
    area: "upper-tapovan",
    lat: 30.1315036,
    lng: 78.3202511,
    coords_verified: true,
    address: "Upper Tapovan",
    description: "Hostel with a cafe and a terrace.",
    stay: true,
    kind: "Hostel",
    google_url: "https://www.google.com/maps/place/The+Hosteller+Rishikesh,+Upper+Tapovan/@30.1315036,78.3202511,17z",
    google_rating: 4.7,
    google_reviews: 8067,
    google_checked: "2026-10-28",
  },
  {
    slug: "live-free-hostel",
    instagram: "livefreehostels",
    website: "https://livefreehostels.com",
    name: "Live Free Hostel",
    area: "lower-tapovan",
    lat: 30.127819,
    lng: 78.3251937,
    coords_verified: true,
    address: "Tapovan",
    description: "Backpacker hostel with a cafe and yoga classes.",
    stay: true,
    kind: "Hostel",
    google_url: "https://www.google.com/maps/place/Live+Free+Hostel+Rishikesh/@30.127819,78.3251937,17z",
    google_rating: 4.5,
    google_reviews: 2978,
    google_checked: "2026-10-28",
  },
  {
    slug: "blue-jay-hostel",
    instagram: "bluejayhostels",
    website: "https://www.bluejayhostels.com",
    name: "Blue Jay Hostel",
    area: "lower-tapovan",
    lat: 30.1300893,
    lng: 78.3251083,
    coords_verified: true,
    address: "Tapovan",
    description: "Hostel with breakfast, wifi and air-conditioned rooms.",
    stay: true,
    kind: "Hostel",
    google_url: "https://www.google.com/maps/place/Blue+Jay+Hostel,+Rishikesh/@30.1300893,78.3251083,17z",
    google_rating: 4.5,
    google_reviews: 1542,
    google_checked: "2026-10-28",
  },
  {
    slug: "shalom-backpackers",
    instagram: "shalombackpackers",
    website: "https://shalombackpackers.com",
    name: "Shalom Backpackers",
    area: "lower-tapovan",
    lat: 30.1271611,
    lng: 78.3260195,
    coords_verified: true,
    address: "Tapovan",
    description: "Relaxed backpacker hostel with a cafe.",
    stay: true,
    kind: "Hostel",
    google_url: "https://www.google.com/maps/place/Shalom+Backpackers+Rishikesh/@30.1271611,78.3260195,17z",
    google_rating: 4.4,
    google_reviews: 3517,
    google_checked: "2026-10-28",
  },
  {
    slug: "zostel-tapovan",
    instagram: "zostel",
    website: "https://www.zostel.com",
    name: "Zostel Rishikesh (Tapovan)",
    area: "lower-tapovan",
    lat: 30.129844,
    lng: 78.3232439,
    coords_verified: true,
    address: "Tapovan",
    description: "Backpacker hostel with mountain views.",
    stay: true,
    kind: "Hostel",
    google_url: "https://www.google.com/maps/place/Zostel+Rishikesh+(Tapovan)/@30.129844,78.3232439,17z",
    google_rating: 4.3,
    google_reviews: 4999,
    google_checked: "2026-10-28",
  },
  // Upper Tapovan
  { slug: "12-monks", name: "12 Monks Hostel & MakaMaka Cafe", area: "upper-tapovan", lat: 30.1331, lng: 78.3196, address: "Upper Tapovan", description: "Hostel cafe with open mics, ecstatic dances, kirtan and live gigs most weekends." },
  { slug: "aavya", name: "Aavya Creative Wellness", area: "upper-tapovan", lat: 30.1343, lng: 78.3183, address: "Balaknath Road, near Prakriti Cafe, Upper Tapovan", description: "Wellness space with sound healing, kirtans, movement workshops, ecstatic dance and festival nights." },
  { slug: "aarcana-cafe", name: "Aarcana Cafe", area: "upper-tapovan", lat: 30.1352, lng: 78.3209, address: "Secret Waterfall Road, Upper Tapovan", description: "Hosts ecstatic dances, cacao ceremonies, yoga classes and flea markets." },
  { slug: "secret-garden-cafe", name: "Secret Garden Cafe", area: "upper-tapovan", lat: 30.1322, lng: 78.3211, address: "Tapovan Road", description: "Garden cafe popular with the yoga crowd." },
  { slug: "devi-music-ashram", name: "Devi Music Ashram", area: "upper-tapovan", lat: 30.1338, lng: 78.3170, address: "Upper Tapovan", description: "Music room concerts and sound healing sessions." },
  { slug: "mvt-kirtan-hall", name: "MVT Kirtan Hall", area: "upper-tapovan", lat: 30.1316, lng: 78.3188, address: "Upper Tapovan", description: "Weekly community kirtan." },
  // From flyers on Tapovan walls, October 2026.
  { slug: "tapashala", name: "Tapashala", area: "upper-tapovan", lat: 30.1325, lng: 78.3207, address: "Balaknath Road, Upper Tapovan, just before Secret Garden Cafe (landmark: Blue Guest House)", description: "Drop-in yoga, kundalini, pranayama, sound healing and bhakti music, Monday to Saturday. Pre-booking only." },
  { slug: "divine-circle", name: "Divine Circle (Studio 2)", area: "upper-tapovan", lat: 30.1336, lng: 78.3197, address: "Tapovan", description: "Healing space with daily meditation and yoga flow, and Drum-Dance-Dissolve ecstatic dance with drums and handpan." },
  { slug: "antara-yoga", name: "Antara Yoga", area: "upper-tapovan", lat: 30.1317, lng: 78.3216, address: "Tapovan", description: "Hatha yoga for all levels in the morning and an intermediate hatha vinyasa flow in the afternoon." },
  { slug: "prakruti-yogashala", name: "Prakruti Yogashala", area: "upper-tapovan", lat: 30.1347, lng: 78.3189, address: "Tapovan", description: "Yoga school that hosts live kirtan evenings." },
  { slug: "nomadic-plate-cafe", name: "Nomadic Plate Cafe", area: "upper-tapovan", lat: 30.1340, lng: 78.3175, address: "Near AYM Yoga School, Tapovan", description: "Pahadi food and an evening retreat — herbal tea, hatha yoga and thali dinner, Tuesday to Saturday." },
  { slug: "ascend-space", name: "Ascend Space", area: "upper-tapovan", lat: 30.1321, lng: 78.3227, address: "Tapovan", description: "MMA gym: jiu-jitsu, boxing, kickboxing, Muay Thai and sparring. Sauna, ice bath and sports massage. Open 9am–9pm, beginners welcome." },
  { slug: "pure-soul-cafe", name: "Pure Soul Cafe (Dewa Retreat)", area: "upper-tapovan", lat: 30.1309, lng: 78.3202, address: "Tapovan", description: "Organic vegetarian cafe that hosts local events." },
  // Lower Tapovan & Laxman Jhula
  { slug: "maharani-shri", name: "Maharani Shri", area: "lower-tapovan", lat: 30.1297, lng: 78.3236, address: "Tapovan", description: "Weekend gigs, yoga drop-ins and ecstatic dances." },
  { slug: "social-soul-cafe", name: "Social Soul Cafe", area: "lower-tapovan", lat: 30.1291, lng: 78.3248, address: "Lower Tapovan", description: "Weekend live music, sound healing and yoga drop-ins." },
  { slug: "bistro-nirvana", name: "Bistro Nirvana", area: "lower-tapovan", lat: 30.1284, lng: 78.3258, address: "Near Green Valley Cottage, Tapovan", description: "Indoor and outdoor cafe." },
  { slug: "ajatananda-ashram", name: "Ajatananda Ashram", area: "lower-tapovan", lat: 30.1283, lng: 78.3263, address: "On the Ganga in Lower Tapovan — 5 minutes from Laxman Jhula on the upper path behind the German Bakery", description: "Riverside ashram dedicated to the oneness of truth. Hosts free interfaith concerts." },
  { slug: "little-buddha-cafe", name: "Little Buddha Cafe", area: "laxman-jhula", lat: 30.1276, lng: 78.3283, address: "Laxman Jhula", description: "Riverside cafe with frequent live music." },
  { slug: "shambala-cafe", name: "Shambala Cafe", area: "laxman-jhula", lat: 30.1281, lng: 78.3274, address: "Tapovan, overlooking Laxman Jhula", description: "Ganga and Laxman Jhula views." },
];

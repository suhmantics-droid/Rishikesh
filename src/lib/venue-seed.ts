// Starting directory of Tapovan venues known for events. Pins are APPROXIMATE
// (coords_verified = 0) — fix each one from /admin/venues by clicking the map.
// Organisers can also add new venues when they post a flyer.

export const VENUE_SEED = [
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

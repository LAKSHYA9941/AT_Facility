// ---------------------------------------------------------------------------
// Pre-planned package destinations — static data
// Images are hosted on Cloudinary
// ---------------------------------------------------------------------------

export type Category = "himalayas" | "spiritual" | "heritage" | "honeymoon";

export interface Destination {
  slug: string;
  name: string;
  category: Category;
  state: string;
  tagline: string;
  description: string;
  highlights: string[];
  bestTime: string;
  duration: string;
  imageUrl: string;
}

export const categoryMeta: Record<
  Category,
  { label: string; emoji: string; blurb: string }
> = {
  himalayas: {
    label: "Himalayan Escapes",
    emoji: "🏔️",
    blurb: "Snow-capped peaks, alpine lakes & mountain drives.",
  },
  spiritual: {
    label: "Spiritual Circuits",
    emoji: "🪔",
    blurb: "Temples, ghats and sacred journeys of the north.",
  },
  heritage: {
    label: "Heritage & Golden Triangle",
    emoji: "🏯",
    blurb: "Forts, palaces and timeless Mughal grandeur.",
  },
  honeymoon: {
    label: "Honeymoon Specials",
    emoji: "💑",
    blurb: "Romantic getaways crafted just for two.",
  },
};

export const destinations: Destination[] = [
  // ── Himalayan Escapes ────────────────────────────────────────────────────
  {
    slug: "manali",
    name: "Manali",
    category: "himalayas",
    state: "Himachal Pradesh",
    tagline: "Snow, pine & adventure",
    description:
      "Wake up to deodar forests, drift down the Beas and chase snow at Solang & Rohtang.",
    highlights: [
      "Solang Valley snow sports",
      "Old Manali cafés",
      "Hadimba Temple",
      "Rohtang Pass excursion",
    ],
    bestTime: "Oct – Mar (snow), Apr – Jun (pleasant)",
    duration: "5N / 6D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063000/atfacility_destinations/i0klrrcxr3czptz1iys8.avif",
  },
  {
    slug: "shimla",
    name: "Shimla",
    category: "himalayas",
    state: "Himachal Pradesh",
    tagline: "Queen of the hills",
    description:
      "Colonial charm meets Himalayan vistas on the historic Mall Road.",
    highlights: [
      "Mall Road & Ridge",
      "Toy train ride",
      "Kufri day trip",
      "Jakhu Temple",
    ],
    bestTime: "Mar – Jun, Dec – Feb",
    duration: "4N / 5D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063011/atfacility_destinations/zljeek6xzgsnoo46b0yv.avif",
  },
  {
    slug: "leh-ladakh",
    name: "Leh-Ladakh",
    category: "himalayas",
    state: "Ladakh",
    tagline: "Land of high passes",
    description:
      "Moonlit monasteries, turquoise Pangong and the world's highest motorable roads.",
    highlights: [
      "Pangong Tso",
      "Nubra Valley & Hunder dunes",
      "Khardung La pass",
      "Thiksey Monastery",
    ],
    bestTime: "May – September",
    duration: "7N / 8D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062994/atfacility_destinations/md0bll2pzyalfqudyxgw.avif",
  },
  {
    slug: "spiti",
    name: "Spiti Valley",
    category: "himalayas",
    state: "Himachal Pradesh",
    tagline: "Middle land of monks",
    description:
      "Stark, surreal Himalayan desert dotted with thousand-year-old gompas.",
    highlights: [
      "Key Monastery",
      "Chandratal lake",
      "Langza fossils",
      "Chicham bridge",
    ],
    bestTime: "Jun – October",
    duration: "7N / 8D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063014/atfacility_destinations/gwkrwgqygtwwmemuyx7j.avif",
  },
  {
    slug: "kashmir",
    name: "Kashmir",
    category: "himalayas",
    state: "Jammu & Kashmir",
    tagline: "Paradise on earth",
    description:
      "Shikara rides on Dal, tulip gardens and the silver slopes of Gulmarg.",
    highlights: [
      "Dal Lake houseboat",
      "Gulmarg Gondola",
      "Pahalgam meadows",
      "Sonmarg glaciers",
    ],
    bestTime: "Mar – Oct (snow Dec – Feb)",
    duration: "6N / 7D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062988/atfacility_destinations/ajlz5zpxbceydho8lofp.avif",
  },

  // ── Spiritual Circuits ───────────────────────────────────────────────────
  {
    slug: "haridwar",
    name: "Haridwar",
    category: "spiritual",
    state: "Uttarakhand",
    tagline: "Gateway to the gods",
    description: "Witness the timeless Ganga aarti at Har Ki Pauri.",
    highlights: [
      "Har Ki Pauri aarti",
      "Mansa Devi temple",
      "Chandi Devi ropeway",
    ],
    bestTime: "Year round",
    duration: "2N / 3D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062982/atfacility_destinations/lf4wqxxqrnhgm721aowc.avif",
  },
  {
    slug: "rishikesh",
    name: "Rishikesh",
    category: "spiritual",
    state: "Uttarakhand",
    tagline: "Yoga capital of the world",
    description:
      "The holy Ganges, suspension bridges and soulful river-side ashrams.",
    highlights: [
      "Triveni Ghat aarti",
      "Lakshman Jhula",
      "Beatles Ashram",
      "River rafting",
    ],
    bestTime: "Sep – May",
    duration: "3N / 4D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063009/atfacility_destinations/rs1wyqpwrz4ngx4zcjli.avif",
  },
  {
    slug: "vaishno-devi",
    name: "Vaishno Devi",
    category: "spiritual",
    state: "Jammu & Kashmir",
    tagline: "Climb to Mata's darshan",
    description:
      "A sacred trek through the Trikuta hills to the holy cave shrine.",
    highlights: ["Bhawan darshan", "Bhairon Temple", "Helicopter option"],
    bestTime: "Mar – Oct",
    duration: "2N / 3D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063018/atfacility_destinations/l91lzrtn70qsmxfujmrd.avif",
  },
  {
    slug: "amritsar",
    name: "Amritsar",
    category: "spiritual",
    state: "Punjab",
    tagline: "City of the Golden Temple",
    description:
      "The Harmandir Sahib, langar seva and the stirring Wagah border ceremony.",
    highlights: [
      "Golden Temple",
      "Jallianwala Bagh",
      "Wagah border parade",
      "Punjabi food trail",
    ],
    bestTime: "Oct – Mar",
    duration: "2N / 3D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062971/atfacility_destinations/pe9gp5we4gwfrxhqetk1.avif",
  },
  {
    slug: "char-dham",
    name: "Char Dham Yatra",
    category: "spiritual",
    state: "Uttarakhand",
    tagline: "The four sacred abodes",
    description:
      "Yamunotri, Gangotri, Kedarnath and Badrinath — a once-in-a-lifetime pilgrimage.",
    highlights: [
      "Kedarnath darshan",
      "Badrinath temple",
      "Gangotri glacier route",
      "Helicopter packages",
    ],
    bestTime: "May – June, Sep – Oct",
    duration: "10N / 11D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062975/atfacility_destinations/kwxjdadzr7kedsejnnec.avif",
  },

  // ── Heritage & Golden Triangle ───────────────────────────────────────────
  {
    slug: "delhi",
    name: "Delhi",
    category: "heritage",
    state: "Delhi",
    tagline: "Where centuries collide",
    description: "Mughal monuments, colonial avenues and bustling bazaars.",
    highlights: [
      "Red Fort & Jama Masjid",
      "Qutub Minar",
      "India Gate",
      "Chandni Chowk food walk",
    ],
    bestTime: "Oct – Mar",
    duration: "3N / 4D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062976/atfacility_destinations/y2jqwvrow0v212vsslap.avif",
  },
  {
    slug: "agra",
    name: "Agra",
    category: "heritage",
    state: "Uttar Pradesh",
    tagline: "Home of eternal love",
    description:
      "The Taj Mahal at sunrise — a sight that lives up to every legend.",
    highlights: [
      "Taj Mahal sunrise",
      "Agra Fort",
      "Mehtab Bagh",
      "Fatehpur Sikri",
    ],
    bestTime: "Oct – Mar",
    duration: "1N / 2D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062969/atfacility_destinations/zoco3xhr97sgdoytklle.avif",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    category: "heritage",
    state: "Rajasthan",
    tagline: "The pink city",
    description:
      "Palaces, observatories and the regal Amer Fort in royal Rajasthan.",
    highlights: ["Amer Fort", "Hawa Mahal", "City Palace", "Jantar Mantar"],
    bestTime: "Oct – Mar",
    duration: "3N / 4D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062985/atfacility_destinations/h4ywz3canflbvuobnvsx.avif",
  },
  {
    slug: "udaipur",
    name: "Udaipur",
    category: "heritage",
    state: "Rajasthan",
    tagline: "Venice of the east",
    description:
      "Lake palaces, marble courtyards and golden-hour boat rides on Pichola.",
    highlights: [
      "Lake Pichola boat",
      "City Palace",
      "Jagdish Temple",
      "Sajjangarh sunset",
    ],
    bestTime: "Sep – Mar",
    duration: "3N / 4D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063017/atfacility_destinations/fsddbu8dv5x3rhyafsoe.avif",
  },
  {
    slug: "jodhpur",
    name: "Jodhpur",
    category: "heritage",
    state: "Rajasthan",
    tagline: "The blue city",
    description:
      "Mehrangarh towers above a sea of indigo houses and timeless havelis.",
    highlights: [
      "Mehrangarh Fort",
      "Jaswant Thada",
      "Clock Tower bazaar",
      "Desert excursions",
    ],
    bestTime: "Oct – Mar",
    duration: "2N / 3D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062986/atfacility_destinations/bx4j1hmbrouqhrqdb9uw.avif",
  },

  // ── Honeymoon Specials ───────────────────────────────────────────────────
  {
    slug: "manali-honeymoon",
    name: "Manali Honeymoon",
    category: "honeymoon",
    state: "Himachal Pradesh",
    tagline: "Snow-kissed romance",
    description: "Cozy cottages, candle-lit dinners and snow walks for two.",
    highlights: [
      "Private cab",
      "Candle-lit dinner",
      "Snow point excursion",
      "Couple spa",
    ],
    bestTime: "Year round",
    duration: "5N / 6D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062997/atfacility_destinations/zabdvslz3al1qpswdmt2.avif",
  },
  {
    slug: "shimla-honeymoon",
    name: "Shimla & Manali Combo",
    category: "honeymoon",
    state: "Himachal Pradesh",
    tagline: "Two hill towns, one love story",
    description:
      "Colonial Shimla and dreamy Manali combined into one unforgettable escape.",
    highlights: [
      "Mall Road strolls",
      "Kufri day",
      "Solang adventure",
      "Hot-cocoa nights",
    ],
    bestTime: "Year round",
    duration: "6N / 7D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063006/atfacility_destinations/tkjgh8s8vhqeet0ziux6.avif",
  },
  {
    slug: "nainital-honeymoon",
    name: "Nainital",
    category: "honeymoon",
    state: "Uttarakhand",
    tagline: "By the emerald lake",
    description:
      "Boat rides, ropeways and soft mountain mornings in the Kumaon hills.",
    highlights: [
      "Naini Lake boating",
      "Snow View ropeway",
      "Tiffin Top trek",
      "Mall Road",
    ],
    bestTime: "Mar – Jun, Sep – Nov",
    duration: "4N / 5D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783063007/atfacility_destinations/cpr6dd1tcbgcoi4pmuce.avif",
  },
  {
    slug: "kashmir-honeymoon",
    name: "Kashmir Honeymoon",
    category: "honeymoon",
    state: "Jammu & Kashmir",
    tagline: "Houseboats & shikaras",
    description:
      "Float on Dal Lake, glide up Gulmarg and lose yourselves in the valley.",
    highlights: [
      "Deluxe houseboat",
      "Shikara ride",
      "Gulmarg gondola",
      "Pahalgam day",
    ],
    bestTime: "Mar – Oct",
    duration: "6N / 7D",
    imageUrl:
      "https://res.cloudinary.com/cloud4lakshya/image/upload/v1783062990/atfacility_destinations/zhaoptdgkqothgnmum0u.avif",
  },
];

export const getDestination = (slug: string) =>
  destinations.find((d) => d.slug === slug);

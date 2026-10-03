export type DistrictId = "town" | "river" | "hills" | "coast" | "bridge";
export const DISTRICTS = [
  {
    id: "town",
    name: "Old town",
    icon: "🏡",
    x: 480,
    y: 350,
    color: 0xe2e8cf,
    goal: "Say hello, find a meal, make a friend.",
  },
  {
    id: "river",
    name: "Riverside",
    icon: "🛶",
    x: 1420,
    y: 360,
    color: 0xd0e5df,
    goal: "Find your way and get ready for a journey.",
  },
  {
    id: "hills",
    name: "Hill village",
    icon: "🌳",
    x: 470,
    y: 1130,
    color: 0xd6e4cd,
    goal: "Visit a family and explore regional food.",
  },
  {
    id: "coast",
    name: "Island coast",
    icon: "🏝",
    x: 1360,
    y: 1130,
    color: 0xf2e4c5,
    goal: "Shop by the sea and catch a ferry.",
  },
  {
    id: "bridge",
    name: "English town",
    icon: "🌉",
    x: 2240,
    y: 750,
    color: 0xe4dce8,
    goal: "Practise everyday English, one conversation at a time.",
  },
] as const;
export interface Location {
  id: string;
  district: DistrictId;
  name: string;
  person: string;
  icon: string;
  x: number;
  y: number;
  course: "th" | "en";
  region: string;
  relationship: "friend" | "elder" | "stranger";
  gender: "male" | "female";
  color: number;
}
const rows: [
  string,
  DistrictId,
  string,
  string,
  string,
  region?: string,
  relationship?: "friend" | "elder" | "stranger",
][] = [
  [
    "first-hello",
    "town",
    "Neighbour’s café",
    "Mali",
    "☕",
    "bangkok",
    "friend",
  ],
  ["noodle-stall", "town", "Noodle stall", "Arun", "🍜"],
  ["market-haggling", "town", "Gift market", "Dao", "🎁"],
  ["restaurant", "town", "Family restaurant", "Nok", "🍛"],
  [
    "introduce-yourself",
    "town",
    "Community garden",
    "Pim",
    "🌻",
    "bangkok",
    "friend",
  ],
  ["directions", "river", "Crossroads", "Lek", "🧭"],
  ["taxi", "river", "Taxi stop", "Chai", "🚕"],
  ["hotel-checkin", "river", "Riverside hotel", "Som", "🏨"],
  ["pharmacy", "river", "Pharmacy", "Bee", "💊"],
  ["emergency", "river", "Help point", "Pat", "🩺"],
  ["floating-market", "river", "Floating market", "Fah", "🛶", "west"],
  [
    "meet-parents",
    "hills",
    "Family home",
    "Auntie Noi",
    "🏡",
    "chiangmai",
    "elder",
  ],
  ["songthaew", "hills", "Red truck stop", "Ton", "🛻", "chiangmai"],
  ["som-tam", "hills", "Papaya salad stall", "Kwan", "🥗", "isan"],
  ["fruit-market", "hills", "Fruit orchard", "Prae", "🥭", "east"],
  ["seafood-market", "coast", "Seafood pier", "Lada", "🦐", "south"],
  ["island-ferry", "coast", "Island ferry", "Win", "🚤", "phuket"],
  ["en-first-hello", "bridge", "Meeting corner", "Alex", "👋"],
  ["en-coffee-shop", "bridge", "Coffee shop", "Sam", "☕"],
  ["en-restaurant", "bridge", "Diner", "Robin", "🍽"],
  ["en-directions", "bridge", "Station square", "Jamie", "🧭"],
  ["en-hotel", "bridge", "Town hotel", "Taylor", "🏨"],
  ["en-shopping", "bridge", "Clothes shop", "Charlie", "🛍"],
  ["picnic-rehearsal", "town", "Picnic rehearsal", "Mali", "🧺"],
  ["en-weekend-rehearsal", "bridge", "Visitor workshop", "Morgan", "🧳"],
];
export const LOCATIONS: Location[] = rows.map(
  ([id, district, name, person, icon, region, relationship], index) => {
    const d = DISTRICTS.find((d) => d.id === district)!;
    const ordinal = rows
      .slice(0, index)
      .filter((r) => r[1] === district).length;
    return {
      id,
      district,
      name,
      person,
      icon,
      x: d.x - 220 + (ordinal % 3) * 220,
      y: d.y - 150 + Math.floor(ordinal / 3) * 250,
      course: id.startsWith("en-") ? "en" : "th",
      region: region ?? "bangkok",
      relationship: relationship ?? "stranger",
      gender:
        id === "picnic-rehearsal"
          ? "female"
          : index % 2 === 0
            ? "female"
            : "male",
      color: [0xd59b73, 0x99b8a8, 0xbda3c3, 0xe0b762][index % 4],
    };
  },
);
export const QUESTS = [
  {
    id: "welcome",
    name: "Your first day",
    icon: "✉",
    story: "A hello, a hot meal, a gift for a new friend.",
    stops: ["first-hello", "noodle-stall", "market-haggling"],
    ending: "Mali sets a place for you at the picnic. You belong here.",
    reward: "Picnic invitation",
  },
  {
    id: "weekend",
    name: "A weekend away",
    icon: "🧳",
    story: "Find the route, get a taxi, check into your room.",
    stops: ["directions", "taxi", "hotel-checkin"],
    ending:
      "The hotel window opens onto the river. Tomorrow is yours to explore.",
    reward: "River-view postcard",
  },
  {
    id: "family",
    name: "A family feast",
    icon: "🥭",
    story: "Meet your hosts, find fruit, share a meal.",
    stops: ["introduce-yourself", "meet-parents", "fruit-market", "restaurant"],
    ending:
      "Auntie Noi brings another plate. There is always room for one more guest.",
    reward: "Family recipe book",
  },
  {
    id: "north",
    name: "Flavours of the hills",
    icon: "🛻",
    story: "Catch the red truck and order a papaya salad.",
    stops: ["songthaew", "som-tam"],
    ending:
      "The truck rattles home as the hills turn gold. Kwan packed sticky rice for the road.",
    reward: "Woven hill-village ribbon",
  },
  {
    id: "island",
    name: "An island afternoon",
    icon: "🐚",
    story: "Shop on the water, visit the seafood pier, catch a ferry.",
    stops: ["floating-market", "seafood-market", "island-ferry"],
    ending:
      "Win waves from the pier. You have a ticket, a sea breeze, and a new story.",
    reward: "Shell compass",
  },
  {
    id: "care",
    name: "Look after a friend",
    icon: "💚",
    story:
      "Practise asking a pharmacist and a help-point worker for assistance.",
    stops: ["pharmacy", "emergency"],
    ending:
      "You know how to ask for help. These are language exercises, not medical advice.",
    reward: "Kind-neighbour badge",
  },
  {
    id: "english",
    name: "Across the bridge",
    icon: "🌉",
    story: "Meet a friend, order coffee and dinner, find a hotel, go shopping.",
    stops: [
      "en-first-hello",
      "en-coffee-shop",
      "en-restaurant",
      "en-directions",
      "en-hotel",
      "en-shopping",
    ],
    ending:
      "One bridge, six conversations. Your new friends saved a seat at the café.",
    reward: "English-town passport",
  },
  {
    id: "host",
    name: "Be the picnic host",
    icon: "🧺",
    story:
      "Rehearse introducing yourself, welcoming an older guest and ordering a shared meal.",
    stops: ["picnic-rehearsal"],
    ending:
      "Mali hands you the invitation book. Next time, you can be the one who welcomes someone new.",
    reward: "Picnic host’s notebook",
  },
  {
    id: "visitor",
    name: "Welcome a visitor",
    icon: "🧳",
    story:
      "Rehearse directions, a hotel arrival and a coffee order in one mini-adventure.",
    stops: ["en-weekend-rehearsal"],
    ending:
      "Morgan folds the itinerary into a little paper house. You have everything you need to help a visitor settle in.",
    reward: "Visitor’s itinerary",
  },
] as const;
export const SECRETS = [
  {
    id: "cat-parade",
    district: "town",
    x: 120,
    y: 500,
    icon: "🐈",
    name: "The midnight cat club",
    clue: "Someone small is waiting behind the café.",
    story:
      "Three cats step out for their evening parade. Mali calls them the neighbourhood watch.",
  },
  {
    id: "tiny-door",
    district: "town",
    x: 805,
    y: 160,
    icon: "🚪",
    name: "A door for a tiny neighbour",
    clue: "Not every door is person-sized.",
    story:
      "Behind the garden wall, a tiny painted door opens onto a miniature tea party.",
  },
  {
    id: "bottle",
    district: "river",
    x: 1720,
    y: 650,
    icon: "🍾",
    name: "A message on the river",
    clue: "Something is bobbing near the reeds.",
    story:
      "The bottle holds a drawing of this town, made by a traveller who once felt just like you.",
  },
  {
    id: "paper-boat",
    district: "river",
    x: 1060,
    y: 180,
    icon: "⛵",
    name: "The paper-boat regatta",
    clue: "Look beneath the little bridge.",
    story:
      "A fleet of paper boats unfolds. Every boat carries a neighbour’s wish for a good tomorrow.",
  },
  {
    id: "fireflies",
    district: "hills",
    x: 790,
    y: 1400,
    icon: "✨",
    name: "The firefly clearing",
    clue: "A quiet corner glows between the trees.",
    story:
      "Your footsteps wake a constellation of fireflies. Auntie Noi left a cushion here for anyone who needs a quiet minute.",
  },
  {
    id: "orchard",
    district: "hills",
    x: 130,
    y: 900,
    icon: "🥭",
    name: "Prae’s secret orchard",
    clue: "One tree is a little different.",
    story:
      "Prae tucked a tiny swing beneath the mango tree. Even a busy traveller can take a break.",
  },
  {
    id: "shell",
    district: "coast",
    x: 1630,
    y: 1370,
    icon: "🐚",
    name: "The singing shell",
    clue: "The tide left a spiral on the sand.",
    story:
      "A shell seems to hum when the water rolls past. Win swears it remembers every ferry that ever left this pier.",
  },
  {
    id: "turtle",
    district: "coast",
    x: 1050,
    y: 900,
    icon: "🐢",
    name: "The patient passenger",
    clue: "The slowest traveller is near the shore.",
    story:
      "A turtle is heading for the sea. You give it space; it rewards you with one very slow nod.",
  },
  {
    id: "book",
    district: "bridge",
    x: 2470,
    y: 470,
    icon: "📖",
    name: "The travelling library",
    clue: "A forgotten book is waiting by the station.",
    story:
      "The book contains postcards from every district. The final page says: leave a place better than you found it.",
  },
  {
    id: "rainbow",
    district: "bridge",
    x: 1930,
    y: 960,
    icon: "🌈",
    name: "A bridge of colours",
    clue: "Find the small prism beside the bridge.",
    story:
      "Turn the prism and the bridge lights up in five colours—one for every district you have yet to explore.",
  },
] as const;

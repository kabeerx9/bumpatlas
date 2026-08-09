import type { DemoImageKey } from "./images";

/**
 * The shape of one demo household.
 *
 * Every household gets the *same* structure — same number of children, same memories in the
 * same order, same completions — with only names and dates differing. That is what makes
 * them useful for comparison: if account A shows something account B does not, it is a bug,
 * not a data difference.
 */

export type DemoMemory = {
  /** Days before "today", so every seeded household has a fresh-looking timeline. */
  daysAgo: number;
  body: string;
  /** Which child it belongs to, by index into `children`. */
  childIndex: number;
  /** Catalogue key, or null for a text-only memory. */
  image: DemoImageKey | null;
  /** Defaults to HOUSEHOLD. A couple are PRIVATE so that filter is visibly exercised. */
  isPrivate?: boolean;
};

export type DemoHousehold = {
  key: string;
  familyName: string;
  owner: { email: string; name: string };
  coParent: { name: string };
  children: { displayName: string; ageInMonths: number }[];
  isPremium: boolean;
};

/**
 * Four households. Identical content, different names — and one premium, so paywall and
 * limit states are visible without editing the database by hand.
 */
export const DEMO_HOUSEHOLDS: DemoHousehold[] = [
  {
    key: "rivera",
    familyName: "The Rivera household",
    owner: { email: "demo1@bumpatlas.example.com", name: "Ana Rivera" },
    coParent: { name: "Jordan Rivera" },
    children: [
      { displayName: "Mateo", ageInMonths: 26 },
      { displayName: "Ava", ageInMonths: 3 },
    ],
    isPremium: false,
  },
  {
    key: "okafor",
    familyName: "The Okafor household",
    owner: { email: "demo2@bumpatlas.example.com", name: "Chidi Okafor" },
    coParent: { name: "Ngozi Okafor" },
    children: [
      { displayName: "Zuri", ageInMonths: 26 },
      { displayName: "Kene", ageInMonths: 3 },
    ],
    isPremium: true,
  },
  {
    key: "lindqvist",
    familyName: "The Lindqvist household",
    owner: { email: "demo3@bumpatlas.example.com", name: "Sofia Lindqvist" },
    coParent: { name: "Erik Lindqvist" },
    children: [
      { displayName: "Elsa", ageInMonths: 26 },
      { displayName: "Nils", ageInMonths: 3 },
    ],
    isPremium: false,
  },
  {
    key: "haruna",
    familyName: "The Haruna household",
    owner: { email: "demo4@bumpatlas.example.com", name: "Amina Haruna" },
    coParent: { name: "Yusuf Haruna" },
    children: [
      { displayName: "Layla", ageInMonths: 26 },
      { displayName: "Idris", ageInMonths: 3 },
    ],
    isPremium: false,
  },
];

/**
 * Thirty-four memories spread across eleven weeks.
 *
 * Deliberately more than one page of the timeline: at the default page size the old
 * sixteen-entry fixture never produced a cursor, so keyset pagination went untested by
 * anyone browsing a demo account. Eleven weeks also gives the recap screen several past
 * weeks to move between rather than a single current one.
 *
 * Weighted towards the last seven days so Today, weekly progress, and the current recap all
 * have something real to show. Roughly two thirds carry an image, which is enough to see how
 * a photo-heavy timeline actually looks without every card being identical.
 *
 * The oldest entry sits at 77 days, inside the younger child's 3-month life — an eventDate
 * before a child's date of birth is a state the app should never have to render.
 */
export const DEMO_MEMORIES: DemoMemory[] = [
  { daysAgo: 0, body: "First long eye contact\nHeld my gaze through the whole morning feed. Felt like a tiny hello.", childIndex: 1, image: "baby-portrait-mono" },
  { daysAgo: 0, body: "Puddle inspection\nStopped at every single one on the way back from nursery.", childIndex: 0, image: "autumn-leaves-toddler" },
  { daysAgo: 0, body: "Fell asleep mid-sentence on the sofa. Both of us did, if we are honest.", childIndex: 1, image: "cosleep-morning" },
  { daysAgo: 1, body: "Fell asleep on me and I did not move for an hour. No regrets.", childIndex: 1, image: "baby-holding-finger" },
  { daysAgo: 1, body: "Asked where the moon goes in the daytime. I had no good answer.", childIndex: 0, image: null },
  { daysAgo: 1, body: "Helped chop the mushrooms. Helped is doing some work in that sentence.", childIndex: 0, image: "kitchen-chopping-toddler" },
  { daysAgo: 2, body: "Bath time splashing\nSoaked the entire bathroom and thought it was hilarious.", childIndex: 1, image: "bath-time-bubbles" },
  { daysAgo: 2, body: "Grabbed my finger and would not give it back for the entire bus ride.", childIndex: 1, image: "baby-grip-finger" },
  { daysAgo: 3, body: "Wore the dinosaur wellies to breakfast. Would not be talked out of it.", childIndex: 0, image: "kitchen-baking-toddler" },
  { daysAgo: 3, body: "Rolled from front to back on the mat, then looked genuinely surprised.", childIndex: 1, image: null },
  { daysAgo: 3, body: "Crayons everywhere. One of them was even on the paper at one point.", childIndex: 0, image: "crayons-together" },
  { daysAgo: 4, body: "Park bench picnic\nShared half a sandwich and watched the pigeons for twenty minutes.", childIndex: 0, image: "park-bench-reading" },
  { daysAgo: 4, body: "Tiny toes\nNo occasion. I just wanted to remember how small they are right now.", childIndex: 1, image: "baby-toes-closeup" },
  { daysAgo: 5, body: "Slept a four hour stretch. I woke up before they did and checked twice.", childIndex: 1, image: "cot-sleeping" },
  { daysAgo: 5, body: "Blew a dandelion clock and then tried to put it back together.", childIndex: 0, image: "dandelion-blowing" },
  { daysAgo: 6, body: "Sang the whole alphabet, inventing about four new letters near the end.", childIndex: 0, image: "book-naming-animals" },
  { daysAgo: 6, body: "Night feed, 3am\nQuiet, and I did not mind it as much as I expected to.", childIndex: 1, image: "bottle-feed-night", isPrivate: true },
  { daysAgo: 8, body: "Morning light through the curtains\nQuiet ten minutes before the house woke up.", childIndex: 1, image: "family-bed-morning" },
  { daysAgo: 9, body: "Chased a soap bubble across the whole garden and caught exactly none.", childIndex: 0, image: "soap-bubble-reach" },
  { daysAgo: 10, body: "Built a tower of six blocks, knocked it down, immediately rebuilt it.", childIndex: 0, image: "toy-cars-carpet" },
  { daysAgo: 11, body: "Ten minutes of pure starfish sleep, arms out, taking up the whole cot.", childIndex: 1, image: "baby-sleep-starfish" },
  { daysAgo: 12, body: "Grandparents visited. Three generations on one sofa, all slightly overwhelmed.", childIndex: 1, image: "newborn-with-parents" },
  { daysAgo: 13, body: "Emptied the entire toy box to find one specific car. Found it. Left the rest.", childIndex: 0, image: "toy-box-crawling" },
  { daysAgo: 14, body: "First proper giggle. Took a bit of work to get there and it was worth it.", childIndex: 1, image: "bedtime-laughing" },
  { daysAgo: 16, body: "Ran the length of the field for no reason at all and then wanted carrying.", childIndex: 0, image: "field-running-toddler" },
  { daysAgo: 17, body: "Named every animal in the book, mostly correctly, with total confidence.", childIndex: 0, image: null },
  { daysAgo: 19, body: "Fell asleep on the walk home. Transferred to the cot without waking. Rare.", childIndex: 1, image: "carried-in-coat" },
  { daysAgo: 20, body: "Long walk, both asleep by the end of it. Very quiet cup of tea afterwards.", childIndex: 1, image: "park-walk-toddler" },
  { daysAgo: 24, body: "Sat up in the grass unaided for about nine seconds. We are counting it.", childIndex: 1, image: "grass-sitting-baby" },
  { daysAgo: 28, body: "Blanket fort, two torches, one very long story about a bear.", childIndex: 0, image: "blanket-fort-reading" },
  { daysAgo: 35, body: "Beach day\nCold water, no complaints, sand in absolutely everything afterwards.", childIndex: 0, image: "beach-run-toddler" },
  { daysAgo: 44, body: "Sleeping through the middle of the day like it is a full time job.", childIndex: 1, image: "newborn-sleeping-knit" },
  { daysAgo: 56, body: "The whole hand fits around one of my fingers. Writing that down before it stops being true.", childIndex: 1, image: "baby-hand-muslin" },
  { daysAgo: 77, body: "First week home\nNo idea what we were doing. Still do not, but we are all still here.", childIndex: 1, image: "newborn-feet-blanket", isPrivate: true },
];

/**
 * Challenge completions over the last three weeks.
 *
 * Deliberately not every day: a demo account with a perfect streak hides how the weekly
 * progress ring looks when a parent has had a hard week, which is the common case. The
 * earlier weeks are patchier than the current one so the recap history shows variation
 * rather than the same numbers three times.
 */
export const DEMO_COMPLETIONS: { daysAgo: number; kinds: ("STORY" | "WELLNESS" | "LEARN" | "CONNECT")[] }[] = [
  { daysAgo: 0, kinds: ["STORY", "WELLNESS"] },
  { daysAgo: 1, kinds: ["STORY", "LEARN"] },
  { daysAgo: 3, kinds: ["STORY", "WELLNESS"] },
  { daysAgo: 4, kinds: ["WELLNESS", "CONNECT"] },
  { daysAgo: 6, kinds: ["STORY"] },
  { daysAgo: 8, kinds: ["STORY", "WELLNESS"] },
  { daysAgo: 9, kinds: ["WELLNESS"] },
  { daysAgo: 12, kinds: ["STORY", "LEARN"] },
  { daysAgo: 13, kinds: ["STORY"] },
  { daysAgo: 16, kinds: ["WELLNESS"] },
  { daysAgo: 17, kinds: ["STORY", "WELLNESS", "CONNECT"] },
  { daysAgo: 20, kinds: ["STORY"] },
];

/**
 * Other people in the stage cohort.
 *
 * Local-only users, never sign-in-able. They exist because a Connect feed authored entirely
 * by the account reading it is not a feed — it hides comment attribution, the "someone
 * else's post" affordances, and the block and report flows, which are only reachable on a
 * post you did not write. This is the highest-risk surface in the product, so its demo state
 * should not be the one shape that never needs moderating.
 */
export const DEMO_NEIGHBOURS = [
  { key: "priya", name: "Priya N." },
  { key: "tom", name: "Tom B." },
  { key: "yara", name: "Yara S." },
] as const;

export type DemoCommunityPost = {
  daysAgo: number;
  /** Neighbour key, or "owner" for the seeded account itself. */
  author: "owner" | (typeof DEMO_NEIGHBOURS)[number]["key"];
  body: string;
  /** Who reacted, so the counts differ per post instead of every card showing the same number. */
  reactions: ("owner" | (typeof DEMO_NEIGHBOURS)[number]["key"])[];
  comments: { author: "owner" | (typeof DEMO_NEIGHBOURS)[number]["key"]; body: string }[];
};

/** Seeded into a stage group so Connect is not an empty screen. */
export const DEMO_COMMUNITY_POSTS: DemoCommunityPost[] = [
  {
    daysAgo: 0,
    author: "priya",
    body: "Anyone else finding evening fussiness peaks around the same hour? We are hitting it at 6pm most days.",
    reactions: ["owner", "tom", "yara"],
    comments: [
      { author: "owner", body: "Ours is 5.30 on the dot. I have started just accepting that hour is gone." },
      { author: "tom", body: "Same window here. Walking outside helps a bit, or at least it helps me." },
    ],
  },
  {
    daysAgo: 1,
    author: "owner",
    body: "Small win: got out of the house before 10am with both of them dressed. I am counting it.",
    reactions: ["priya", "tom", "yara"],
    comments: [{ author: "yara", body: "That is not a small win, that is the whole win." }],
  },
  {
    daysAgo: 2,
    author: "tom",
    body: "What worked for you when naps suddenly got shorter? Not looking for advice exactly, just company.",
    reactions: ["owner", "priya"],
    comments: [
      { author: "priya", body: "Three weeks of forty minute naps here and then it sorted itself out. No idea why." },
      { author: "owner", body: "No advice, just solidarity. It passed for us but it took a while." },
    ],
  },
  {
    daysAgo: 4,
    author: "yara",
    body: "Reminder to self and anyone who needs it: the washing can wait.",
    reactions: ["owner", "tom"],
    comments: [],
  },
  {
    daysAgo: 6,
    author: "owner",
    body: "First week back at work. Harder than I expected, and also fine. Both true.",
    reactions: ["priya", "yara"],
    comments: [{ author: "priya", body: "Both true is exactly it. The first fortnight was the worst of mine." }],
  },
  {
    daysAgo: 9,
    author: "priya",
    body: "Does anyone actually use the wind-down routines, or is that just something I read about?",
    reactions: ["tom"],
    comments: [{ author: "tom", body: "We do a short one. Mostly it signals to me that the day is ending." }],
  },
  {
    daysAgo: 13,
    author: "yara",
    body: "Took a full hour to myself on Sunday for the first time since February. Recommend.",
    reactions: ["owner", "priya", "tom"],
    comments: [],
  },
];

/**
 * Weekly recaps, oldest last. `weeksAgo: 0` is the current week.
 *
 * Highlights are short derived strings, never memory bodies verbatim — the same rule the
 * generator follows, so a seeded recap and a generated one are indistinguishable on screen.
 */
export const DEMO_RECAPS: { weeksAgo: number; title: string; highlights: string[] }[] = [
  {
    weeksAgo: 0,
    title: "A week of firsts",
    highlights: ["First long eye contact", "Bath time, everywhere", "Puddles on the way home"],
  },
  {
    weeksAgo: 1,
    title: "Quiet mornings",
    highlights: ["Early light before the house woke", "Six blocks, twice", "A four hour stretch"],
  },
  {
    weeksAgo: 2,
    title: "Out and about",
    highlights: ["The long walk that ended in two naps", "A field, at speed", "Nine seconds sitting up"],
  },
];

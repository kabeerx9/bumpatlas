/**
 * The shape of one demo household.
 *
 * Every household gets the *same* structure — same number of children, same memories in the
 * same order, same completions — with only names and dates differing. That is what makes
 * them useful for comparison: if account A shows something account B does not, it is a bug,
 * not a data difference.
 */

/**
 * Deterministic public placeholder image.
 *
 * Lorem Picsum returns a stable photo for a given seed, so re-running the seed produces the
 * same images and screenshots stay comparable. These are generic stock photographs, not
 * baby or family photos — fine for development and internal demos; check the Unsplash
 * licence before any of this appears in public marketing.
 */
export function demoImageUrl(seed: string, width = 900, height = 700): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export type DemoMemory = {
  /** Days before "today", so every seeded household has a fresh-looking timeline. */
  daysAgo: number;
  body: string;
  /** Which child it belongs to, by index into `children`. */
  childIndex: number;
  withImage: boolean;
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
    owner: { email: "demo1@bumpatlas.test", name: "Ana Rivera" },
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
    owner: { email: "demo2@bumpatlas.test", name: "Chidi Okafor" },
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
    owner: { email: "demo3@bumpatlas.test", name: "Sofia Lindqvist" },
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
    owner: { email: "demo4@bumpatlas.test", name: "Amina Haruna" },
    coParent: { name: "Yusuf Haruna" },
    children: [
      { displayName: "Layla", ageInMonths: 26 },
      { displayName: "Idris", ageInMonths: 3 },
    ],
    isPremium: false,
  },
];

/**
 * Sixteen memories per household, spread across three weeks.
 *
 * Weighted towards the last seven days so Today, weekly progress, and the current recap all
 * have something real to show. Roughly two thirds carry an image, which is enough to see how
 * a photo-heavy timeline actually looks without every card being identical.
 */
export const DEMO_MEMORIES: DemoMemory[] = [
  { daysAgo: 0, body: "First long eye contact\nHeld my gaze through the whole morning feed. Felt like a tiny hello.", childIndex: 1, withImage: true },
  { daysAgo: 0, body: "Puddle inspection\nStopped at every single one on the way back from nursery.", childIndex: 0, withImage: true },
  { daysAgo: 1, body: "Fell asleep on me and I did not move for an hour. No regrets.", childIndex: 1, withImage: true },
  { daysAgo: 1, body: "Asked where the moon goes in the daytime. I had no good answer.", childIndex: 0, withImage: false },
  { daysAgo: 2, body: "Bath time splashing\nSoaked the entire bathroom and thought it was hilarious.", childIndex: 1, withImage: true },
  { daysAgo: 3, body: "Wore the dinosaur wellies to breakfast. Would not be talked out of it.", childIndex: 0, withImage: true },
  { daysAgo: 3, body: "Rolled from front to back on the mat, then looked genuinely surprised.", childIndex: 1, withImage: false },
  { daysAgo: 4, body: "Park bench picnic\nShared half a sandwich and watched the pigeons for twenty minutes.", childIndex: 0, withImage: true },
  { daysAgo: 5, body: "Slept a four hour stretch. I woke up before they did and checked twice.", childIndex: 1, withImage: false },
  { daysAgo: 6, body: "Sang the whole alphabet, inventing about four new letters near the end.", childIndex: 0, withImage: true },
  { daysAgo: 8, body: "Morning light through the curtains\nQuiet ten minutes before the house woke up.", childIndex: 1, withImage: true },
  { daysAgo: 10, body: "Built a tower of six blocks, knocked it down, immediately rebuilt it.", childIndex: 0, withImage: true },
  { daysAgo: 12, body: "Grandparents visited. Three generations on one sofa, all slightly overwhelmed.", childIndex: 1, withImage: true },
  { daysAgo: 14, body: "First proper giggle. Took a bit of work to get there and it was worth it.", childIndex: 1, withImage: true },
  { daysAgo: 17, body: "Named every animal in the book, mostly correctly, with total confidence.", childIndex: 0, withImage: false },
  { daysAgo: 20, body: "Long walk, both asleep by the end of it. Very quiet cup of tea afterwards.", childIndex: 1, withImage: true },
];

/**
 * Challenge completions over the last week.
 *
 * Deliberately not every day: a demo account with a perfect streak hides how the weekly
 * progress ring looks when a parent has had a hard week, which is the common case.
 */
export const DEMO_COMPLETIONS: { daysAgo: number; kinds: ("STORY" | "WELLNESS")[] }[] = [
  { daysAgo: 0, kinds: ["STORY", "WELLNESS"] },
  { daysAgo: 1, kinds: ["STORY"] },
  { daysAgo: 3, kinds: ["STORY", "WELLNESS"] },
  { daysAgo: 4, kinds: ["WELLNESS"] },
  { daysAgo: 6, kinds: ["STORY"] },
];

/** Seeded into a stage group so Connect is not an empty screen. */
export const DEMO_COMMUNITY_POSTS = [
  "Anyone else finding evening fussiness peaks around the same hour? We are hitting it at 6pm most days.",
  "Small win: got out of the house before 10am with both of them dressed. I am counting it.",
  "What worked for you when naps suddenly got shorter? Not looking for advice exactly, just company.",
  "Reminder to self and anyone who needs it: the washing can wait.",
  "First week back at work. Harder than I expected, and also fine. Both true.",
];

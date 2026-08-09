/**
 * Curated CC0 photographs for the demo seed.
 *
 * Every entry is a Creative Commons Zero (public domain) photograph from StockSnap,
 * discovered through the Openverse index. CC0 imposes no attribution requirement, but the
 * credit is kept anyway so the provenance of anything that ends up in a screenshot is
 * traceable without re-deriving it.
 *
 * Served through Openverse's image proxy rather than StockSnap's CDN directly, because that
 * CDN returns 403 to any non-browser request — the previous placeholder scheme worked only
 * because Lorem Picsum does not block hotlinking. The proxy returns the 960px rendition.
 *
 * These are stock photographs of unrelated families. Fine for development and internal demos;
 * they are not cleared for public marketing, where the model releases behind each photo would
 * need checking individually.
 */

export type DemoImage = {
  /** Openverse identifier. Stable, and what the proxy URL is built from. */
  id: string;
  width: number;
  height: number;
  /** Title — photographer. CC0, so this is provenance, not a licence obligation. */
  credit: string;
};

export const DEMO_IMAGES = {
  "newborn-feet-blanket": { id: "08840e50-a5b0-436f-9243-a72ba00dca3f", width: 960, height: 640, credit: "Newborn Baby — Studio 7042" },
  "newborn-sleeping-knit": { id: "1f6e6288-bb1e-4530-8955-626fdf8d60db", width: 960, height: 640, credit: "Baby Newborn — Candace McDaniel" },
  "baby-foot-closeup": { id: "15e6981a-85f4-40ae-90b1-fdc6ae8a0886", width: 960, height: 640, credit: "Small Baby — Studio 7042" },
  "baby-feet-hands": { id: "d50f4017-289c-417e-b7cd-9a22406d4797", width: 960, height: 640, credit: "Feet Small — Dana Tentis" },
  "baby-wrapped-blue": { id: "a6cabda1-8167-41dc-a4a1-87d7ce3fce4b", width: 960, height: 640, credit: "Baby Kid — Carlo Navarro" },
  "baby-ear-closeup": { id: "35684549-d920-43e2-93b1-3bd26098fd82", width: 960, height: 640, credit: "Baby Child — Burst" },
  "baby-foot-blanket": { id: "34f35733-bc51-40c6-8160-840b04341381", width: 960, height: 640, credit: "Baby Foot — Candace McDaniel" },
  "baby-grip-finger": { id: "7ae5d76c-ce44-46d7-a42f-51c29b9ca134", width: 960, height: 640, credit: "Hand Finger — Matt Bango" },
  "baby-hand-muslin": { id: "da67bde8-ebc1-4a50-a425-5cfa13500e9b", width: 960, height: 640, credit: "Hand Finger — Matt Bango" },
  "baby-foot-knit": { id: "3ee8a1f6-0292-4fe9-a21b-685e324ab0fe", width: 960, height: 640, credit: "Baby Foot — Matt Bango" },
  "baby-portrait-mono": { id: "1315076b-a7ea-4920-925d-7fe201ba51af", width: 960, height: 1440, credit: "Baby Boy — Candace McDaniel" },
  "toddler-drawing-table": { id: "37f6b8a6-fb0e-4c0d-b3fc-debf0f33b469", width: 960, height: 640, credit: "Mother Child — Direct Media" },
  "parent-yoga-toddler": { id: "c28097d2-1372-4af1-b12a-011b70cf3d1c", width: 960, height: 640, credit: "Mother Child — Yoga Mom" },
  "bedtime-book-toddler": { id: "68aaef4f-bf08-4fa0-b13d-72e37cb6425a", width: 960, height: 640, credit: "Mother Child — Direct Media" },
  "kitchen-baking-toddler": { id: "58aae902-f88d-4906-8de5-33a991de4eaf", width: 960, height: 640, credit: "Mother Child — Direct Media" },
  "kitchen-chopping-toddler": { id: "060d83c5-73c2-4888-8110-3cf15b5ff933", width: 960, height: 640, credit: "Mother Child — Direct Media" },
  "cosleep-morning": { id: "6d02143a-33fc-4391-b93a-ce9006fef9e2", width: 960, height: 640, credit: "Mother Child — Family First" },
  "walk-hand-in-hand": { id: "002cfb2f-7ae4-4705-a18f-6f480ad46f8b", width: 960, height: 640, credit: "Mother Child — Family First" },
  "park-walk-toddler": { id: "94c193ee-3075-4f06-9496-2608369e33b0", width: 960, height: 640, credit: "Father Child — Family Moments" },
  "living-room-floor-play": { id: "2df71071-47ff-4dc6-925e-d127141dd0fb", width: 960, height: 640, credit: "Family Playing — Direct Media" },
  "bath-time-bubbles": { id: "f58663f6-8244-49a8-bb0b-1e2982650b0e", width: 960, height: 608, credit: "Family Bathroom — Bath Time" },
  "family-portrait-garden": { id: "c125a9cf-2d76-4e80-b419-b3e54c9c0649", width: 960, height: 640, credit: "Black Family — Family First" },
  "carried-in-coat": { id: "579ca8cd-2638-4491-a7f8-a88cbe3dcdd1", width: 960, height: 640, credit: "Family Child — Josh Willink" },
  "floor-game-parents": { id: "b294545a-1032-4e3d-b7d2-0cde9676411f", width: 960, height: 640, credit: "Family Playing — Direct Media" },
  "beach-run-toddler": { id: "41edc148-78e4-47e3-8276-a6190e4cbcfd", width: 960, height: 540, credit: "Child Playing — Studio 7042" },
  "autumn-leaves-toddler": { id: "b1ed718b-8e8c-441c-8d28-fc32aa074673", width: 960, height: 649, credit: "Leaves Fall — Scott Webb" },
  "grass-sitting-baby": { id: "4107a980-7aae-4df0-9fd2-1697c441ac4c", width: 960, height: 694, credit: "Green Grass — Danielle Truckenmiller" },
  "soap-bubble-reach": { id: "e9b87d37-c6dc-47aa-b4e0-356b0614ac52", width: 960, height: 640, credit: "Girl Child — Maxime Bhm" },
  "field-running-toddler": { id: "139a746a-c42f-45cf-b556-e15d3db061f8", width: 960, height: 1440, credit: "Kid Child — AJ Montpetit" },
  "toy-box-crawling": { id: "3441b890-a3a9-4a14-afb5-e1a950486e5a", width: 960, height: 640, credit: "People Kid — Freestocks.org" },
  "toy-cars-carpet": { id: "278d0174-5715-4307-b5a1-47f9dfafe57d", width: 960, height: 640, credit: "Child Boy — Markus Spiske" },
  "baby-feet-sand": { id: "37dff617-8562-4fb3-9847-af500125ef4b", width: 960, height: 640, credit: "Baby Feet — Danielle MacInnes" },
  "baby-basket-flowers": { id: "5839db3f-1848-4a69-b662-63e873d67b0d", width: 960, height: 640, credit: "Baby Feet — Gabby Orcutt" },
  "baby-toes-closeup": { id: "6ec7f00c-1f73-4186-9012-d424af43478d", width: 960, height: 640, credit: "Baby Toes — Candace McDaniel" },
  "baby-legs-closeup": { id: "8af8cb67-a518-47b1-8796-de7b167df36a", width: 960, height: 640, credit: "Child Baby — Matt Bango" },
  "dandelion-blowing": { id: "8597f9e9-9e8f-430d-b5d6-19f67313e18e", width: 960, height: 1438, credit: "People Parent — Caleb Jones" },
  "blanket-fort-reading": { id: "e8ad1306-025c-4f56-b41f-ee1490df0d63", width: 960, height: 640, credit: "Parents Child — Family First" },
  "bedtime-laughing": { id: "df833aa6-3226-467d-8e33-d367f57b17a9", width: 960, height: 640, credit: "Family Parents — Direct Media" },
  "bottle-feed-night": { id: "39632171-3db4-48ea-9f00-e411fcfed383", width: 960, height: 640, credit: "People Mother — Andrew Branch" },
  "newborn-with-parents": { id: "d113c17d-417f-4ec7-b05d-2873ad1c1ee8", width: 960, height: 640, credit: "People Father — Andrew Branch" },
  "park-piggyback": { id: "bfbc01c8-4783-4354-a83a-62e8e47ce31d", width: 960, height: 640, credit: "Father Son — Family Moments" },
  "cot-sleeping": { id: "a5d5d62f-d697-4aa9-934d-e40f046e10a7", width: 960, height: 1440, credit: "Bedroom Bed — Dakota Corbin" },
  "baby-hand-covers": { id: "de3670c3-6391-41ca-95e7-ca9cb8d5ac17", width: 960, height: 640, credit: "Child Person — Markus Spiske" },
  "baby-holding-finger": { id: "e209918f-2093-4d55-aef3-a72eb1cb8676", width: 960, height: 1261, credit: "Baby Holding — Studio 7042" },
  "baby-sleep-starfish": { id: "d26ee0c3-d41b-442e-8e07-f2d29dec3c5c", width: 960, height: 636, credit: "Baby Infant — Maierean Andrei" },
  "family-bed-morning": { id: "508734b2-1426-4254-b0f5-265bf7b390c2", width: 960, height: 640, credit: "Bed Family — Direct Media" },
  "book-naming-animals": { id: "ec094a60-ce6b-486e-b5f0-7a3e908c6d52", width: 960, height: 641, credit: "Baby Kid — Ben White" },
  "park-bench-reading": { id: "6eb76a9e-822b-4a51-a033-4d93754be2ae", width: 960, height: 640, credit: "People Father — Matthew Henry" },
  "crayons-together": { id: "32fbc9ba-2af6-4a56-b8d3-78651bfbcbe5", width: 960, height: 640, credit: "Father Son — Direct Media" },
  "avatar-parent-a": { id: "a514e487-56bf-406f-9dcd-d723a7d6d372", width: 960, height: 640, credit: "Mother Child — Family First" },
  "avatar-parent-b": { id: "31d35e4b-4ba7-45c4-a53f-7b781591dedb", width: 960, height: 640, credit: "Mother Child — Family First" },
  "avatar-parent-c": { id: "3d971eb3-74df-487a-9594-1feab9e8fc60", width: 960, height: 640, credit: "Father Child — Family Moments" },
  "avatar-parent-d": { id: "7bfbd271-940d-4b54-b41c-12c0f1d8799a", width: 960, height: 1440, credit: "Father Baby — Direct Media" },} as const satisfies Record<string, DemoImage>;

export type DemoImageKey = keyof typeof DEMO_IMAGES;

/**
 * Absolute URL for a catalogue image.
 *
 * Absolute on purpose: the media serializer passes non-relative storage keys straight
 * through outside production, so a seeded row needs no object storage to render.
 */
export function demoImageUrl(key: DemoImageKey): string {
  return `https://api.openverse.org/v1/images/${DEMO_IMAGES[key].id}/thumb/?full_size=true`;
}

/** Portraits used for `User.imageUrl`, kept separate so memory photos never leak into avatars. */
export const DEMO_AVATARS = [
  "avatar-parent-a",
  "avatar-parent-b",
  "avatar-parent-c",
  "avatar-parent-d",
] as const satisfies readonly DemoImageKey[];

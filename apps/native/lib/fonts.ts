import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";

/**
 * Two families, one job each (see `design-system/README.md`):
 *
 *   Poppins  display only — screen titles, card titles, section headers,
 *            numerals in stat tiles, the wordmark. Geometric, friendly, round.
 *   Inter    everything else — body copy, chips, labels, timestamps, buttons.
 *            Narrower and quieter, so display type stays the loud thing.
 *
 * Mixing these up is the single fastest way to make a screen stop looking like
 * the design: Poppins body copy reads as a children's app, Inter titles read as
 * a dashboard.
 */
export const fontFamilies = {
  // Body / UI — Inter.
  ui: "Inter_400Regular",
  uiMedium: "Inter_500Medium",
  uiSemibold: "Inter_600SemiBold",
  uiBold: "Inter_700Bold",
  // Display — Poppins.
  display: "Poppins_600SemiBold",
  displayMedium: "Poppins_500Medium",
  displayBold: "Poppins_700Bold",
  displayHeavy: "Poppins_800ExtraBold",
  /** Legacy aliases — the serif is gone; these now resolve to display Poppins. */
  editorial: "Poppins_700Bold",
  editorialSemibold: "Poppins_600SemiBold",
} as const;

/** Variants that render in Poppins. Everything else renders in Inter. */
const displayVariants = new Set(["hero", "heading", "title", "subhead"]);

export function useAppFonts() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  return { loaded, error };
}

export function resolveUiFont(weight?: string, variant?: string) {
  if (variant && displayVariants.has(variant)) {
    switch (weight) {
      case "regular":
      case "medium":
        return fontFamilies.displayMedium;
      case "semibold":
        return fontFamilies.display;
      default:
        // Display defaults heavy: the design sets titles at 700, hero at 800.
        return variant === "hero" ? fontFamilies.displayHeavy : fontFamilies.displayBold;
    }
  }

  switch (weight) {
    case "bold":
      return fontFamilies.uiBold;
    case "semibold":
      return fontFamilies.uiSemibold;
    case "medium":
      return fontFamilies.uiMedium;
    default:
      return fontFamilies.ui;
  }
}

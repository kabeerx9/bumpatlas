import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";

export const fontFamilies = {
  ui: "Poppins_400Regular",
  uiMedium: "Poppins_500Medium",
  uiSemibold: "Poppins_600SemiBold",
  uiBold: "Poppins_700Bold",
  editorial: "Fraunces_700Bold",
  editorialSemibold: "Fraunces_600SemiBold",
} as const;

export function useAppFonts() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  return { loaded, error };
}

export function resolveUiFont(weight?: string, variant?: string) {
  if (variant === "heading" || variant === "title" || variant === "hero") {
    if (weight === "bold") return fontFamilies.uiBold;
    if (weight === "medium") return fontFamilies.uiMedium;
    if (weight === "regular") return fontFamilies.ui;
    return fontFamilies.uiSemibold;
  }

  if (variant === "label" || variant === "subhead") {
    if (weight === "bold") return fontFamilies.uiBold;
    if (weight === "regular") return fontFamilies.ui;
    return fontFamilies.uiSemibold;
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

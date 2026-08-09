import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { colors } from "@/design-system/tokens";

export type AppColorScheme = "light" | "dark";
export type AppColorSchemePreference = AppColorScheme | "system";

export const defaultColorScheme: AppColorScheme = "light";
export const defaultColorSchemePreference: AppColorSchemePreference = defaultColorScheme;

const themePreferenceStorageKey = "bumpatlas-theme-preference";
const themePreferenceListeners = new Set<() => void>();

let colorSchemePreference: AppColorSchemePreference = defaultColorSchemePreference;
let hasRequestedStoredPreference = false;

/**
 * Semantic surface. Feature code reads THIS, never raw hex.
 *
 * Two things changed shape in the Soft Atlas redesign, and both are load-bearing:
 *
 * 1. `primary` is honey with ink text in BOTH schemes. The source design has no
 *    ink-filled button anywhere — the accent is the call to action. Any screen
 *    that assumed `primary` was dark and paired it with white text will now be
 *    unreadable, so `primaryText` moved to ink to match.
 * 2. `backgroundGradient` is the real canvas. `background` is only the flat
 *    fallback for surfaces that cannot host a gradient (nav theme, modals,
 *    system chrome). Prefer `Screen` / `Atmosphere`, which render the gradient.
 */
export const appThemes = {
  light: {
    colorScheme: "light",
    colors: {
      background: colors.surface.app,
      backgroundGradient: colors.gradient.canvas,
      backgroundGradientBold: colors.gradient.canvasBold,
      surface: colors.surface.card,
      surfaceElevated: colors.surface.elevated,
      surfaceMuted: colors.surface.cool,
      surfaceWarm: colors.surface.warm,
      surfaceInverse: colors.surface.inverse,
      text: colors.text.primary,
      textSecondary: colors.text.secondary,
      textTertiary: colors.text.tertiary,
      textMuted: colors.text.muted,
      textFaint: colors.text.faint,
      textInverse: colors.text.inverse,
      brandText: colors.brand.honeyDeep,
      border: colors.border.hairline,
      borderStrong: colors.border.subtle,
      // Primary action = honey pill, ink text. There is no ink button.
      primary: colors.brand.honey,
      primaryPressed: "#E3A82F",
      primaryText: colors.text.primary,
      // Secondary / selected chip = same honey fill.
      secondary: colors.brand.honey,
      secondaryText: colors.text.primary,
      accent: colors.brand.honeySoft,
      accentText: colors.brand.honeyDeep,
      danger: colors.status.error,
      dangerSurface: "#FFFFFF",
      dangerBorder: colors.status.errorBorder,
      warningSurface: colors.brand.honeySoft,
      warningBorder: "#F0D7A4",
      mintSurface: colors.pastel.mint,
      mintBorder: "rgba(126,149,131,0.28)",
    },
  },
  dark: {
    colorScheme: "dark",
    colors: {
      background: "#211B18",
      // Dark keeps the same three hues at ~8% luminance so the wash still
      // reads as the same brand, just after hours.
      backgroundGradient: ["#1D211E", "#231C17", "#241A1C"],
      backgroundGradientBold: ["#1A1F1C", "#221B16", "#26191C"],
      surface: "#2E2622",
      surfaceElevated: "#38302B",
      surfaceMuted: "#261F1B",
      surfaceWarm: "#312822",
      surfaceInverse: colors.surface.card,
      text: "#F7F0EA",
      textSecondary: "rgba(247,240,234,0.74)",
      textTertiary: "rgba(247,240,234,0.58)",
      textMuted: "rgba(247,240,234,0.45)",
      textFaint: "rgba(247,240,234,0.32)",
      textInverse: colors.text.primary,
      brandText: colors.brand.honey,
      border: "rgba(255,255,255,0.10)",
      borderStrong: "rgba(255,255,255,0.16)",
      primary: colors.brand.honey,
      primaryPressed: "#E3A82F",
      primaryText: colors.text.primary,
      secondary: colors.brand.honey,
      secondaryText: colors.text.primary,
      accent: "rgba(244,185,66,0.16)",
      accentText: colors.brand.honey,
      danger: colors.status.errorBorder,
      dangerSurface: "rgba(201,115,106,0.14)",
      dangerBorder: "rgba(231,180,174,0.46)",
      warningSurface: "rgba(244,185,66,0.14)",
      warningBorder: "rgba(244,185,66,0.32)",
      mintSurface: "rgba(207,227,214,0.14)",
      mintBorder: "rgba(207,227,214,0.26)",
    },
  },
} as const;

export type AppTheme = (typeof appThemes)[AppColorScheme];

export function getAppTheme(colorScheme: AppColorScheme | null | undefined = defaultColorScheme) {
  return appThemes[colorScheme ?? defaultColorScheme];
}

function normalizeColorScheme(colorScheme: ReturnType<typeof useRNColorScheme>): AppColorScheme {
  return colorScheme === "dark" ? "dark" : defaultColorScheme;
}

function isColorSchemePreference(value: string | null): value is AppColorSchemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getColorSchemePreferenceSnapshot() {
  return colorSchemePreference;
}

function subscribeToColorSchemePreference(listener: () => void) {
  themePreferenceListeners.add(listener);
  return () => {
    themePreferenceListeners.delete(listener);
  };
}

function emitColorSchemePreferenceChange() {
  themePreferenceListeners.forEach((listener) => {
    listener();
  });
}

async function hydrateColorSchemePreference() {
  if (hasRequestedStoredPreference) {
    return;
  }

  hasRequestedStoredPreference = true;

  try {
    const storedPreference = await SecureStore.getItemAsync(themePreferenceStorageKey);

    if (!isColorSchemePreference(storedPreference) || storedPreference === colorSchemePreference) {
      return;
    }

    colorSchemePreference = storedPreference;
    emitColorSchemePreferenceChange();
  } catch (error) {
    console.warn("Failed to load color scheme preference.", error);
  }
}

export function getEffectiveColorScheme(
  preference: AppColorSchemePreference,
  systemColorScheme: ReturnType<typeof useRNColorScheme>,
): AppColorScheme {
  return preference === "system" ? normalizeColorScheme(systemColorScheme) : preference;
}

export function setAppColorSchemePreference(preference: AppColorSchemePreference) {
  if (preference === colorSchemePreference) {
    return;
  }

  colorSchemePreference = preference;
  emitColorSchemePreferenceChange();

  void SecureStore.setItemAsync(themePreferenceStorageKey, preference).catch((error) => {
    console.warn("Failed to save color scheme preference.", error);
  });
}

export function useAppColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const preference = useSyncExternalStore(
    subscribeToColorSchemePreference,
    getColorSchemePreferenceSnapshot,
    getColorSchemePreferenceSnapshot,
  );
  const colorScheme = getEffectiveColorScheme(preference, systemColorScheme);

  useEffect(() => {
    void hydrateColorSchemePreference();
  }, []);

  return {
    colorScheme,
    colorSchemePreference: preference,
    isDarkColorScheme: colorScheme === "dark",
    setColorScheme: setAppColorSchemePreference,
    setColorSchemePreference: setAppColorSchemePreference,
    toggleColorScheme: () => {
      setAppColorSchemePreference(colorScheme === "dark" ? "light" : "dark");
    },
  };
}

export function useAppTheme() {
  const { colorScheme } = useAppColorScheme();

  return useMemo(() => getAppTheme(colorScheme), [colorScheme]);
}

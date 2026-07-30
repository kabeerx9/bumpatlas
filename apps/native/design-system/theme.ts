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

export const appThemes = {
  light: {
    colorScheme: "light",
    colors: {
      background: colors.surface.app,
      surface: colors.surface.card,
      surfaceElevated: colors.surface.elevated,
      surfaceMuted: colors.surface.cool,
      surfaceWarm: colors.surface.warm,
      surfaceInverse: colors.surface.inverse,
      text: colors.text.primary,
      textSecondary: colors.text.secondary,
      textTertiary: colors.text.tertiary,
      textMuted: colors.text.muted,
      textInverse: colors.text.inverse,
      brandText: colors.brand.terracotta,
      border: colors.border.hairline,
      borderStrong: colors.border.subtle,
      // Primary action = ink pill, white text (reference CTA style).
      primary: colors.brand.ink,
      primaryPressed: "#3A342A",
      primaryText: colors.text.inverse,
      // Secondary / selected = honey fill, ink text.
      secondary: colors.brand.honey,
      secondaryText: colors.text.primary,
      accent: colors.brand.honeySoft,
      accentText: colors.brand.terracotta,
      danger: colors.status.error,
      dangerSurface: "#FFFFFF",
      dangerBorder: colors.status.errorBorder,
      warningSurface: "#FBF0DC",
      warningBorder: "#EED9AC",
      mintSurface: "rgba(217,161,63,0.14)",
      mintBorder: "rgba(217,161,63,0.28)",
    },
  },
  dark: {
    colorScheme: "dark",
    colors: {
      background: "#1E1A12",
      surface: "#2A251B",
      surfaceElevated: "#332D21",
      surfaceMuted: "#251F16",
      surfaceWarm: "#2E271B",
      surfaceInverse: colors.surface.card,
      text: "#F7F1E2",
      textSecondary: "rgba(247,241,226,0.72)",
      textTertiary: "rgba(247,241,226,0.55)",
      textMuted: "rgba(247,241,226,0.42)",
      textInverse: colors.text.primary,
      brandText: colors.brand.honey,
      border: "rgba(255,255,255,0.12)",
      borderStrong: "rgba(255,255,255,0.18)",
      // Ink pills vanish on espresso — dark mode CTAs go honey with ink text.
      primary: colors.brand.honey,
      primaryPressed: "#E3B45F",
      primaryText: colors.text.primary,
      secondary: colors.brand.honey,
      secondaryText: colors.text.primary,
      accent: "rgba(242,200,120,0.16)",
      accentText: colors.brand.honey,
      danger: colors.status.errorBorder,
      dangerSurface: "rgba(199,87,78,0.14)",
      dangerBorder: "rgba(229,164,159,0.48)",
      warningSurface: "rgba(192,138,44,0.16)",
      warningBorder: "rgba(192,138,44,0.36)",
      mintSurface: "rgba(242,200,120,0.14)",
      mintBorder: "rgba(242,200,120,0.28)",
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

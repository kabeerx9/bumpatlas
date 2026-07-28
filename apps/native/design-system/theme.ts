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
      brandText: colors.brand.purple600,
      border: colors.border.hairline,
      borderStrong: colors.border.subtle,
      primary: colors.brand.mint,
      primaryPressed: colors.brand.mintHover,
      primaryText: colors.text.onMint,
      secondary: colors.brand.purple600,
      secondaryText: colors.text.onPurple,
      accent: colors.brand.lavenderLight,
      accentText: colors.brand.purple600,
      danger: colors.status.error,
      dangerSurface: "#FFFFFF",
      dangerBorder: colors.status.errorBorder,
      warningSurface: "#FEF3C7",
      warningBorder: "#FDE68A",
      mintSurface: "rgba(142,227,193,0.24)",
      mintBorder: "rgba(16,185,129,0.22)",
    },
  },
  dark: {
    colorScheme: "dark",
    colors: {
      background: colors.surface.dark,
      surface: "#242427",
      surfaceElevated: "#2C2C30",
      surfaceMuted: "#1F2024",
      surfaceWarm: "#23211F",
      surfaceInverse: colors.surface.card,
      text: colors.text.inverse,
      textSecondary: "rgba(248,247,244,0.72)",
      textTertiary: "rgba(248,247,244,0.55)",
      textMuted: "rgba(248,247,244,0.42)",
      textInverse: colors.text.primary,
      brandText: colors.brand.lavender,
      border: "rgba(255,255,255,0.12)",
      borderStrong: "rgba(255,255,255,0.18)",
      primary: colors.brand.mint,
      primaryPressed: colors.brand.mintHover,
      primaryText: colors.text.onMint,
      secondary: colors.brand.lavender,
      secondaryText: colors.text.primary,
      accent: "rgba(188,167,255,0.18)",
      accentText: colors.brand.lavender,
      danger: colors.status.errorBorder,
      dangerSurface: "rgba(226,75,74,0.14)",
      dangerBorder: "rgba(240,153,158,0.48)",
      warningSurface: "rgba(245,158,11,0.16)",
      warningBorder: "rgba(245,158,11,0.36)",
      mintSurface: "rgba(142,227,193,0.16)",
      mintBorder: "rgba(142,227,193,0.28)",
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

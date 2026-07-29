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
      primary: colors.brand.peach,
      primaryPressed: colors.brand.peachHover,
      primaryText: colors.text.onPeach,
      secondary: colors.brand.ink,
      secondaryText: colors.text.inverse,
      accent: colors.brand.peachSoft,
      accentText: colors.brand.ink,
      danger: colors.status.error,
      dangerSurface: "#FFFFFF",
      dangerBorder: colors.status.errorBorder,
      warningSurface: "#FFF6E8",
      warningBorder: "#F0D7A8",
      mintSurface: colors.brand.sageSoft,
      mintBorder: "rgba(106,143,168,0.28)",
    },
  },
  dark: {
    colorScheme: "dark",
    colors: {
      background: colors.surface.dark,
      surface: "#3A322E",
      surfaceElevated: "#443C37",
      surfaceMuted: "#322B27",
      surfaceWarm: "#3F3530",
      surfaceInverse: colors.surface.card,
      text: colors.text.inverse,
      textSecondary: "rgba(247,241,236,0.72)",
      textTertiary: "rgba(247,241,236,0.55)",
      textMuted: "rgba(247,241,236,0.42)",
      textInverse: colors.text.primary,
      brandText: colors.brand.peach,
      border: "rgba(255,255,255,0.12)",
      borderStrong: "rgba(255,255,255,0.18)",
      primary: colors.brand.peach,
      primaryPressed: colors.brand.peachHover,
      primaryText: colors.text.onPeach,
      secondary: colors.brand.peachSoft,
      secondaryText: colors.text.primary,
      accent: "rgba(106,143,168,0.2)",
      accentText: colors.brand.peach,
      danger: colors.status.errorBorder,
      dangerSurface: "rgba(199,91,87,0.14)",
      dangerBorder: "rgba(227,164,161,0.48)",
      warningSurface: "rgba(201,138,59,0.16)",
      warningBorder: "rgba(201,138,59,0.36)",
      mintSurface: "rgba(106,143,168,0.16)",
      mintBorder: "rgba(106,143,168,0.28)",
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

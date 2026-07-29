import type { ViewStyle } from "react-native";

/**
 * Visual system — sky clay / dusty blue:
 * cool mist canvas, clay-blue CTAs, soft fog atmosphere.
 * Token keys (`peach*`) kept for compatibility; values are the new accent.
 */
export const colors = {
  brand: {
    peach: "#6A8FA8",
    peachHover: "#5A7F98",
    peachSoft: "#E4EEF4",
    terracotta: "#4F738C",
    sage: "#8FA3B0",
    sageDeep: "#5E7382",
    sageSoft: "rgba(106,143,168,0.22)",
    ink: "#243038",
    blush: "#C5D8E4",
  },
  discovery: {
    teal: "#6A8FA8",
    deep: "#243038",
  },
  status: {
    success: "#5F8A6A",
    emerald: "#6A8FA8",
    emeraldDark: "#4F738C",
    emeraldText: "#3D5A6B",
    error: "#C75B57",
    errorBorder: "#E3A4A1",
    warning: "#C98A3B",
    amber: "#D4A35A",
  },
  transport: {
    walk: "#6A8FA8",
    ride: "#6A8FA8",
    transit: "#8FA3B5",
    bike: "#5A7F98",
  },
  surface: {
    app: "#F3F5F7",
    warm: "#F7F9FB",
    cool: "#EEF2F5",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    dark: "#243038",
    inverse: "#243038",
    mist: "#E8EEF2",
    wash: "#E4EEF4",
    sleep: "#E7EEF5",
    feed: "#E4EEF4",
  },
  text: {
    primary: "#243038",
    secondary: "rgba(36,48,56,0.68)",
    tertiary: "rgba(36,48,56,0.5)",
    muted: "#8A969E",
    inverse: "#FFFFFF",
    onMint: "#FFFFFF",
    onPurple: "#FFFFFF",
    onSage: "#FFFFFF",
    onPeach: "#FFFFFF",
    link: "#5A7F98",
  },
  border: {
    hairline: "rgba(36,48,56,0.08)",
    subtle: "#DCE3E8",
    warm: "#D5DEE5",
    lavender: "#D0DCE5",
    strong: "#243038",
  },
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  page: 24,
  sectionGap: 28,
  cardPadding: 18,
  bottomNavHeight: 68,
  statusBarHeight: 44,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  sheet: 32,
  full: 9999,
} as const;

export const borderWidth = {
  hairline: 0.5,
  tab: 0.33,
  thin: 1,
  emphasis: 1.5,
} as const;

export const typography = {
  fontFamily: {
    logo: "Poppins_600SemiBold",
    ui: "Poppins_400Regular",
    editorial: "Fraunces_700Bold",
    fallback: "System",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  size: {
    hero: 36,
    heading: 30,
    title: 22,
    subhead: 17,
    body: 15,
    bodySmall: 13,
    caption: 12,
    label: 11,
  },
  lineHeight: {
    hero: 42,
    heading: 36,
    title: 28,
    subhead: 24,
    body: 22,
    bodySmall: 18,
    caption: 16,
    label: 14,
  },
} as const;

export const shadows = {
  none: {},
  soft: {
    shadowColor: "#243038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: "#243038",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  purple: {
    shadowColor: colors.brand.peach,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  mint: {
    shadowColor: colors.brand.sage,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  tabBarHeight: spacing.bottomNavHeight,
  icon: {
    tab: 20,
    action: 16,
    nav: 14,
    badge: 8,
  },
  hitSlop: {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
  },
} as const;

export const designTokens = {
  colors,
  spacing,
  radius,
  borderWidth,
  typography,
  shadows,
  layout,
} as const;

export type DesignTokens = typeof designTokens;

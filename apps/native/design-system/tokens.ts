import type { ViewStyle } from "react-native";

/**
 * Visual system matched to the user's parenting UI kit references:
 * warm cream canvas, peach CTAs, soft sage blobs, airy spacing.
 */
export const colors = {
  brand: {
    peach: "#E59B8A",
    peachHover: "#D88978",
    peachSoft: "#F8E4DE",
    terracotta: "#C46B5A",
    sage: "#A8B79A",
    sageDeep: "#7E9170",
    sageSoft: "rgba(168,183,154,0.28)",
    ink: "#2C2420",
    blush: "#F3C7BC",
  },
  discovery: {
    teal: "#7E9170",
    deep: "#2C2420",
  },
  status: {
    success: "#6F8F6A",
    emerald: "#7E9170",
    emeraldDark: "#4F6148",
    emeraldText: "#4F6148",
    error: "#C75B57",
    errorBorder: "#E3A4A1",
    warning: "#C98A3B",
    amber: "#D4A35A",
  },
  transport: {
    walk: "#7E9170",
    ride: "#E59B8A",
    transit: "#8FA3B5",
    bike: "#6A8FA8",
  },
  surface: {
    app: "#F7F1EC",
    warm: "#FFF8F4",
    cool: "#F3EEE8",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    dark: "#2C2420",
    inverse: "#2C2420",
    mist: "#EFE8E1",
    wash: "#E8F0E4",
    sleep: "#E7EEF5",
    feed: "#F8E4DE",
  },
  text: {
    primary: "#2C2420",
    secondary: "rgba(44,36,32,0.68)",
    tertiary: "rgba(44,36,32,0.5)",
    muted: "#A39891",
    inverse: "#FFFFFF",
    onMint: "#FFFFFF",
    onPurple: "#FFFFFF",
    onSage: "#FFFFFF",
    onPeach: "#FFFFFF",
    link: "#7A9BB0",
  },
  border: {
    hairline: "rgba(44,36,32,0.08)",
    subtle: "#E4DBD3",
    warm: "#E8DFD7",
    lavender: "#D7E0D2",
    strong: "#2C2420",
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
    shadowColor: "#2C2420",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: "#2C2420",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  purple: {
    shadowColor: colors.brand.peach,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  mint: {
    shadowColor: colors.brand.sage,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
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

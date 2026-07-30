import type { ViewStyle } from "react-native";

/**
 * Visual system — "warm nursery light":
 * butter canvas, white cards, ink pill CTAs, honey selected states,
 * pastel card-stack edges. Legacy token keys (`peach*`, `sage*`,
 * `transport`, `discovery`) are kept for compatibility; their values
 * now resolve into the honey/butter palette.
 */
export const colors = {
  brand: {
    ink: "#211D15",
    honey: "#F2C878",
    honeyDeep: "#D9A13F",
    honeySoft: "#F8E8C4",
    butter: "#F4EDDA",
    // Legacy accent keys — resolve to the honey scale.
    peach: "#D9A13F",
    peachHover: "#C08A2C",
    peachSoft: "#F8E8C4",
    terracotta: "#A96F1F",
    sage: "#8A9971",
    sageDeep: "#5F7050",
    sageSoft: "rgba(217,161,63,0.16)",
    blush: "#F3D8DC",
  },
  /** Pastel edges for stacked-card decks and playful fills. */
  pastel: {
    petal: "#F3D8DC",
    mint: "#DCE9D5",
    lemon: "#F6E9C0",
    sky: "#DFE7EE",
  },
  discovery: {
    teal: "#D9A13F",
    deep: "#211D15",
  },
  status: {
    success: "#61865C",
    emerald: "#61865C",
    emeraldDark: "#4C6B48",
    emeraldText: "#425E3F",
    error: "#C7574E",
    errorBorder: "#E5A49F",
    warning: "#C08A2C",
    amber: "#D9A13F",
  },
  transport: {
    walk: "#D9A13F",
    ride: "#D9A13F",
    transit: "#8A9971",
    bike: "#C08A2C",
  },
  surface: {
    app: "#F4EDDA",
    warm: "#FAF5E7",
    cool: "#EFE7D2",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    dark: "#211D15",
    inverse: "#211D15",
    mist: "#F1E9D6",
    wash: "#F8E8C4",
    sleep: "#DFE7EE",
    feed: "#F8E8C4",
  },
  text: {
    primary: "#221E16",
    secondary: "rgba(34,30,22,0.66)",
    tertiary: "rgba(34,30,22,0.48)",
    muted: "#9A9078",
    inverse: "#FFFFFF",
    onMint: "#221E16",
    onPurple: "#FFFFFF",
    onSage: "#FFFFFF",
    onPeach: "#FFFFFF",
    link: "#A96F1F",
  },
  border: {
    hairline: "rgba(34,30,22,0.08)",
    subtle: "#E8DFC9",
    warm: "#EAD9B0",
    lavender: "#F0E4C9",
    strong: "#211D15",
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
  bottomNavHeight: 92,
  statusBarHeight: 44,
} as const;

export const radius = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  sheet: 36,
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
    editorial: "Poppins_600SemiBold",
    fallback: "System",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  size: {
    hero: 34,
    heading: 28,
    title: 22,
    subhead: 17,
    body: 15,
    bodySmall: 13,
    caption: 12,
    label: 11,
  },
  lineHeight: {
    hero: 40,
    heading: 34,
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
    shadowColor: "#5C4A1E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: "#5C4A1E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  purple: {
    shadowColor: "#D9A13F",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  mint: {
    shadowColor: "#8A9971",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  tabBarHeight: spacing.bottomNavHeight,
  icon: {
    tab: 22,
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

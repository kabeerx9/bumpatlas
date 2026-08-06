import type { ViewStyle } from "react-native";

/**
 * Visual system — "Soft Atlas".
 *
 * Derived from the Claude Design source of truth (`Bumpatlas.dc.html`).
 *
 *   Canvas    a three-stop pastel wash: mint -> cream -> blush, top-left to
 *             bottom-right. Never a flat fill — the gradient IS the brand.
 *   Cards     pure white, generous radii (16-22), almost no border, a very
 *             soft warm shadow. Contrast comes from white-on-wash, not lines.
 *   Accent    honey `#F4B942` — the single accent. It fills the primary CTA,
 *             the selected chip/toggle, the progress ring, the send button.
 *   Ink       `#2B231F`, a warm near-black. Sits ON honey; never behind it.
 *   Type      Poppins for display, Inter for everything else.
 *
 * Legacy token keys (`peach*`, `sage*`, `transport`, `discovery`, `butter`)
 * are retained so the ~80 feature files that reference them keep compiling;
 * their values now resolve into the Soft Atlas palette.
 */
export const colors = {
  brand: {
    /** Warm near-black. Body copy, display type, text on honey. */
    ink: "#2B231F",
    /** The accent. Fills only — see `honeyDeep` for accent-coloured text. */
    honey: "#F4B942",
    /** Accessible honey: use when accent must be TEXT on a white/wash bg. */
    honeyDeep: "#A9741A",
    /** Tint wash for accent-flavoured surfaces and badges. */
    honeySoft: "#FCEBC8",
    /** Legacy alias for the cream gradient stop. */
    butter: "#FBEFE4",
    // Legacy accent keys — resolve to the honey scale.
    peach: "#F4B942",
    peachHover: "#D99F2B",
    peachSoft: "#FCEBC8",
    terracotta: "#A9741A",
    sage: "#7E9583",
    sageDeep: "#5C7563",
    sageSoft: "rgba(207,227,214,0.55)",
    blush: "#F6D3C9",
  },
  /** Pastel fills: avatar chips, card-stack edges, category washes. */
  pastel: {
    petal: "#F6D3C9",
    mint: "#CFE3D6",
    lemon: "#F4E3B0",
    sky: "#D9E1F0",
  },
  /**
   * The signature canvas wash. Render with `expo-linear-gradient` using
   * `gradient.canvas` + `gradient.canvasLocations` + `gradient.diagonal`.
   */
  gradient: {
    /** In-app screen canvas (lighter — cards must still read as white). */
    canvas: ["#EEF5F1", "#FCF1E7", "#FDEAEE"],
    /** Full-bleed marketing/auth/onboarding wash (more saturated). */
    canvasBold: ["#E9F2EE", "#FBEFE4", "#FCE8ED"],
    /** Stop positions shared by both washes. */
    canvasLocations: [0, 0.55, 1],
    /** 160deg in CSS terms. */
    diagonal: { start: { x: 0.15, y: 0 }, end: { x: 0.85, y: 1 } },
  },
  discovery: {
    teal: "#F4B942",
    deep: "#2B231F",
  },
  status: {
    success: "#5C7563",
    emerald: "#5C7563",
    emeraldDark: "#4A6151",
    emeraldText: "#41564A",
    error: "#C9736A",
    errorBorder: "#E7B4AE",
    warning: "#A9741A",
    amber: "#F4B942",
  },
  transport: {
    walk: "#F4B942",
    ride: "#F4B942",
    transit: "#7E9583",
    bike: "#A9741A",
  },
  surface: {
    /** Fallback flat canvas for anything that cannot host a gradient. */
    app: "#F7F1EA",
    warm: "#FCF1E7",
    cool: "#EEF5F1",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    dark: "#2B231F",
    inverse: "#2B231F",
    mist: "#FDEAEE",
    wash: "#FCEBC8",
    sleep: "#D9E1F0",
    feed: "#FCEBC8",
  },
  text: {
    primary: "#2B231F",
    /** Long-form body copy — softer than primary, still AA on white. */
    secondary: "#6A5A51",
    /** Supporting one-liners under a title. */
    tertiary: "#8A7A72",
    /** Timestamps, counts, disabled. Decorative — never sole meaning. */
    muted: "#9A8C85",
    /** Inactive tab labels, chevrons, dividers-as-text. */
    faint: "#C9BDB4",
    inverse: "#FFFFFF",
    onMint: "#2B231F",
    onPurple: "#2B231F",
    onSage: "#FFFFFF",
    onPeach: "#2B231F",
    link: "#A9741A",
  },
  border: {
    hairline: "rgba(43,35,31,0.06)",
    subtle: "#F1E9DE",
    warm: "#EFE1D2",
    lavender: "#F1E9DE",
    strong: "#2B231F",
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
  /** Horizontal screen gutter. 20 in the source design. */
  page: 20,
  sectionGap: 20,
  cardPadding: 16,
  bottomNavHeight: 88,
  statusBarHeight: 44,
} as const;

export const radius = {
  xs: 12,
  sm: 14,
  /** Stat tiles, chips-with-content. */
  md: 16,
  /** The default card. */
  lg: 18,
  /** Hero media. */
  xl: 22,
  /** Tab bar, bottom sheets, segmented containers. */
  sheet: 24,
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
    /** Display / wordmark. */
    logo: "Poppins_700Bold",
    /** Body + UI. */
    ui: "Inter_400Regular",
    /** Headings. */
    editorial: "Poppins_700Bold",
    fallback: "System",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  /**
   * Scale is measured off the 402pt iPhone frame in the source design, so
   * these are real device points, not desktop pixels.
   */
  size: {
    hero: 26,
    heading: 22,
    title: 18,
    subhead: 15,
    body: 14,
    bodySmall: 13,
    caption: 12,
    label: 11,
  },
  lineHeight: {
    hero: 32,
    heading: 28,
    title: 24,
    subhead: 21,
    body: 21,
    bodySmall: 19,
    caption: 16,
    label: 14,
  },
} as const;

/**
 * Shadows are deliberately near-invisible: the design separates layers with
 * white-on-wash, not with elevation. Anything heavier reads as a different app.
 */
export const shadows = {
  none: {},
  soft: {
    shadowColor: "#2B231F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  card: {
    shadowColor: "#2B231F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  /** Floating tab bar — light spills UPWARD from under the bar. */
  tabBar: {
    shadowColor: "#2B231F",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
  },
  /** Legacy name — now the honey CTA glow. */
  purple: {
    shadowColor: "#D99F2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  mint: {
    shadowColor: "#7E9583",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  tabBarHeight: spacing.bottomNavHeight,
  /** Every scrollable tab screen needs this as `contentContainerStyle` bottom pad. */
  tabBarScrollPadding: 120,
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

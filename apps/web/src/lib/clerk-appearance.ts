import type { SignIn } from "@clerk/react";
import type { ComponentProps } from "react";

/** @clerk/react doesn't re-export its appearance theme type directly (it
 * lives in the internal `@clerk/shared/types` package), so it's derived
 * from a component that accepts it instead. */
type ClerkAppearanceTheme = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Shared Clerk `appearance` config for <SignIn>/<SignUp>/<UserButton> so the
 * widget matches the mockup tokens (docs/design/web-mockups-reference.md)
 * instead of Clerk's default theme. One object, reused everywhere Clerk
 * renders UI, so the four auth routes and the header's <UserButton> can't
 * drift from each other.
 */
export const clerkAppearance: ClerkAppearanceTheme = {
  variables: {
    colorPrimary: "oklch(58% 0.09 150)",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorForeground: "#1F2420",
    colorMutedForeground: "#4B4F45",
    colorInput: "#FFFFFF",
    colorInputForeground: "#1F2420",
    colorNeutral: "#1F2420",
    borderRadius: "9px",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    card: "shadow-[0_1px_2px_rgba(42,32,19,0.04)] border border-[#E1E4DC]",
    headerTitle: "font-medium",
  },
};

import { appThemes, designTokens } from "@/design-system";

export { designTokens };

export const NAV_THEME = {
  light: {
    background: appThemes.light.colors.background,
    border: appThemes.light.colors.border,
    card: appThemes.light.colors.surface,
    notification: appThemes.light.colors.danger,
    primary: appThemes.light.colors.secondary,
    text: appThemes.light.colors.text,
  },
  dark: {
    background: appThemes.dark.colors.background,
    border: appThemes.dark.colors.border,
    card: appThemes.dark.colors.surface,
    notification: appThemes.dark.colors.danger,
    primary: appThemes.dark.colors.primary,
    text: appThemes.dark.colors.text,
  },
};

import { Pressable, StyleSheet, View } from "react-native";

import { SignOutButton } from "@/components/sign-out-button";
import { AppText, type AppColorSchemePreference, Screen, spacing, useAppTheme } from "@/design-system";
import { useColorScheme } from "@/lib/use-color-scheme";

const themeOptions: Array<{
  label: string;
  value: AppColorSchemePreference;
}> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export default function ProfileTabRoute() {
  const theme = useAppTheme();
  const { colorSchemePreference, setColorScheme } = useColorScheme();

  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="caption" tone="tertiary" weight="semibold">
          Third route
        </AppText>
        <AppText variant="heading">
          Profile
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.copy}>
          Generic profile tab for now.
        </AppText>
        <View
          style={[
            styles.themePanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.themeHeader}>
            <AppText variant="subhead" weight="semibold">
              Theme
            </AppText>
            <AppText variant="caption" tone="secondary">
              {theme.colorScheme === "dark" ? "Dark" : "Light"}
            </AppText>
          </View>
          <View
            style={[
              styles.themeControl,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {themeOptions.map((option) => {
              const selected = colorSchemePreference === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setColorScheme(option.value);
                  }}
                  style={[
                    styles.themeOption,
                    selected && {
                      backgroundColor: theme.colors.secondary,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    tone={selected ? "inverse" : "secondary"}
                    weight="semibold"
                    align="center"
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.actions}>
          <SignOutButton />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  copy: {
    opacity: 0.72,
  },
  themePanel: {
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  themeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  themeControl: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.xs,
  },
  themeOption: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  actions: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
});

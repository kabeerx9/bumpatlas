import { StyleSheet, View } from "react-native";

import { AppText, Screen, spacing } from "@/design-system";

export default function SavedTabRoute() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="caption" tone="tertiary" weight="semibold">
          Second route
        </AppText>
        <AppText variant="heading">
          Saved
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.copy}>
          Generic saved tab for now.
        </AppText>
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
});

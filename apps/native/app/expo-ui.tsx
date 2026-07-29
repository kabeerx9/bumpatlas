import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

/**
 * @expo/ui showcase can pull native modules missing from this binary.
 * Keep the route free of those imports so product screens can load.
 */
export default function ExpoUiRoute() {
  const router = useRouter();
  return (
    <SoftStackShell title="Expo UI" onBack={() => router.back()}>
      <View style={styles.box}>
        <AppText weight="semibold">Showcase disabled</AppText>
        <AppText variant="bodySmall" tone="secondary">
          This lab screen is disabled so missing native UI modules do not crash the app. Use a
          rebuilt native binary to open the full showcase.
        </AppText>
        <Button onPress={() => router.back()}>Back</Button>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: 16,
  },
});

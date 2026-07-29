import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useRouter } from "expo-router";

/**
 * Widgets require a custom native binary with expo-widgets.
 * Keep this route free of expo-widgets imports so the main app can boot.
 */
export default function WidgetsRoute() {
  const router = useRouter();
  return (
    <SoftStackShell title="Widgets" onBack={() => router.back()}>
      <View style={styles.box}>
        <AppText weight="semibold">Native rebuild required</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Home Screen widgets need `pnpm --filter native android` (or ios) so expo-widgets is
          linked. This playground is disabled in the current binary so it doesn&apos;t crash the
          app.
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

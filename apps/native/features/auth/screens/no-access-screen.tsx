import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function NoAccessScreen() {
  const router = useRouter();

  return (
    <SoftStackShell
      title="No access"
      scroll={false}
      onBack={() => router.replace(appRoutes.home)}
    >
      <View style={styles.content}>
        <Feather name="slash" size={32} color={colors.brand.peach} />
        <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
          Your invite may have expired or been revoked. Ask the household owner for a new link.
        </AppText>
        <Button size="lg" onPress={() => router.replace(appRoutes.home)}>
          Back to Today
        </Button>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  copy: { maxWidth: 300, lineHeight: 24 },
});

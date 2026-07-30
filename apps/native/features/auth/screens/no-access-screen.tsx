import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function NoAccessScreen() {
  const router = useRouter();

  return (
    <SoftStackShell
      title="No access"
      centered
      onBack={() => router.replace(appRoutes.home)}
    >
      <View style={styles.iconBadge}>
        <Feather name="slash" size={28} color={colors.brand.ink} />
      </View>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        Your invite may have expired or been revoked. Ask the household owner for a new link.
      </AppText>
      <Button size="lg" onPress={() => router.replace(appRoutes.home)}>
        Back to Today
      </Button>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.honeySoft,
    marginBottom: spacing.xs,
  },
  copy: { maxWidth: 300, lineHeight: 24 },
});

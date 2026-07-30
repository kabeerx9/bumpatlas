import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function SessionExpiredScreen() {
  const router = useRouter();

  return (
    <SoftStackShell
      title="Session expired"
      centered
      onBack={() => router.replace(appRoutes.auth.signIn)}
    >
      <View style={styles.iconBadge}>
        <Feather name="lock" size={28} color={colors.brand.ink} />
      </View>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        Please sign in again to continue with your household data.
      </AppText>
      <Button size="lg" onPress={() => router.replace(appRoutes.auth.signIn)}>
        Sign in
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

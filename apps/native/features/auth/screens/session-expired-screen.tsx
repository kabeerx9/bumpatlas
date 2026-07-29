import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function SessionExpiredScreen() {
  const router = useRouter();

  return (
    <SoftStackShell
      title="Session expired"
      scroll={false}
      onBack={() => router.replace(appRoutes.auth.signIn)}
    >
      <View style={styles.content}>
        <Feather name="lock" size={32} color={colors.brand.peach} />
        <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
          Please sign in again to continue with your household data.
        </AppText>
        <Button size="lg" onPress={() => router.replace(appRoutes.auth.signIn)}>
          Sign in
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

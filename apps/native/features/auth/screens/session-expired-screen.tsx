import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText, Button, colors } from "@/design-system";
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
      <Feather name="lock" size={32} color={colors.brand.peach} />
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
  copy: { maxWidth: 300, lineHeight: 24 },
});

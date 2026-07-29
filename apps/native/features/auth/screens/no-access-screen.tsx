import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText, Button, colors } from "@/design-system";
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
      <Feather name="slash" size={32} color={colors.brand.peach} />
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
  copy: { maxWidth: 300, lineHeight: 24 },
});

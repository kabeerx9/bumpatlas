import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, spacing } from "@/design-system";
import { appRoutes } from "@/navigation/routes";

export function NoAccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Feather name="slash" size={32} color={colors.brand.peach} />
          <AppText variant="heading" align="center">
            No access to this household
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
            Your invite may have expired or been revoked. Ask the household owner for a new link.
          </AppText>
          <Button size="lg" onPress={() => router.replace(appRoutes.home)}>
            Back to Today
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.page,
    gap: spacing.lg,
  },
  copy: { maxWidth: 300, lineHeight: 24 },
});

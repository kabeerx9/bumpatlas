import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button, Screen, Surface, colors, spacing } from "@/design-system";
import { SignOutButton } from "@/components/sign-out-button";
import { mockProfile } from "@/features/mock/demo-data";
import { appRoutes } from "@/navigation/routes";

export function FamilyScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="caption" tone="secondary" weight="semibold">
          FAMILY
        </AppText>
        <AppText variant="heading">Your household</AppText>
        <AppText variant="body" tone="secondary">
          Invite adults who help care for {mockProfile.displayName}. Memories stay private by default.
        </AppText>

        <Surface style={styles.card}>
          <AppText variant="caption" tone="secondary" weight="semibold">
            MEMBERS
          </AppText>
          <View style={styles.memberRow}>
            <View style={styles.dot} />
            <View>
              <AppText weight="semibold">You · Owner</AppText>
              <AppText variant="caption" tone="secondary">
                {userId ? `Signed in` : "Local preview"}
              </AppText>
            </View>
          </View>
          <View style={styles.memberRow}>
            <View style={[styles.dot, styles.dotMuted]} />
            <View>
              <AppText weight="semibold">Partner seat open</AppText>
              <AppText variant="caption" tone="secondary">
                Free includes 2 adults
              </AppText>
            </View>
          </View>
          <Button onPress={() => undefined}>Invite partner</Button>
        </Surface>

        <Surface style={styles.card}>
          <AppText weight="semibold">Weekly recap</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Preview of “This week with {mockProfile.displayName}” will appear here once memories sync.
          </AppText>
          <Button variant="ghost" onPress={() => undefined}>
            Preview share card
          </Button>
        </Surface>

        <Surface style={styles.card}>
          <AppText weight="semibold">Account</AppText>
          <Button variant="ghost" onPress={() => router.push(appRoutes.account)}>
            Account settings
          </Button>
          <SignOutButton />
        </Surface>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    gap: spacing.md,
    padding: spacing.cardPadding,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.brand.sage,
  },
  dotMuted: {
    backgroundColor: colors.border.subtle,
  },
});

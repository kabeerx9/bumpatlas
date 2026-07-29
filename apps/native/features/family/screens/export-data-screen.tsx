import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";

export function ExportDataScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "preparing" | "ready">("idle");

  function startExport() {
    setStatus("preparing");
    setTimeout(() => setStatus("ready"), 1200);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Export data</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Feather name="download" size={28} color={colors.text.inverse} />
            <AppText variant="heading" tone="inverse" align="center">
              Your household data
            </AppText>
            <AppText variant="bodySmall" style={styles.heroCopy} align="center">
              Export includes memories, milestones, wellness history, and account metadata. Free
              forever — never paywalled.
            </AppText>
          </View>

          <View style={styles.list}>
            {["Journal memories (text + photos)", "Milestones & recaps", "Wellness completions", "Account & consent records"].map(
              (item) => (
                <View key={item} style={styles.row}>
                  <Feather name="check" size={16} color={colors.brand.peach} />
                  <AppText variant="bodySmall">{item}</AppText>
                </View>
              ),
            )}
          </View>

          {status === "ready" ? (
            <View style={styles.ready}>
              <AppText weight="semibold">Export ready</AppText>
              <AppText variant="bodySmall" tone="secondary">
                In production, a download link would arrive by email within 48 hours.
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            size="lg"
            disabled={status === "preparing"}
            onPress={status === "ready" ? () => router.back() : startExport}
          >
            {status === "idle"
              ? "Request export"
              : status === "preparing"
                ? "Preparing..."
                : "Done"}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.page, gap: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  heroCopy: { color: "rgba(255,255,255,0.88)", maxWidth: 300 },
  list: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ready: {
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  footer: { paddingHorizontal: spacing.page, paddingBottom: spacing.xl },
});

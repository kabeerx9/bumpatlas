import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "@/design-system";
import { SoftScreen } from "@/features/shared/components/soft-screen";

type SoftStackShellProps = {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  closeIcon?: "arrow-left" | "x";
  right?: ReactNode;
  footer?: ReactNode;
  /** Default true. Use false only for composer / sticky-footer layouts. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Center content vertically (empty / status screens). */
  centered?: boolean;
};

/** Modal / stack screens: shared cream atmosphere + back header. */
export function SoftStackShell({
  title,
  children,
  onBack,
  closeIcon = "arrow-left",
  right,
  footer,
  scroll = true,
  contentStyle,
  centered = false,
}: SoftStackShellProps) {
  const router = useRouter();

  return (
    <SoftScreen scroll={false} edges={["top", "bottom"]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Feather name={closeIcon} size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">{title}</AppText>
          {right ?? <View style={styles.iconBtn} />}
        </View>

        {scroll ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              centered && styles.centeredContent,
              contentStyle,
            ]}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.body,
              centered && styles.centeredContent,
              contentStyle,
            ]}
          >
            {children}
          </View>
        )}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    flexGrow: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});

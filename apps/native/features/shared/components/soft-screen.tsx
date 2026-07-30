import type { ReactNode } from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/design-system/tokens";

type SoftScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "right" | "bottom" | "left">;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
};

/** Shared mist + clay-blue atmosphere used across MVP tabs. */
export function SoftScreen({
  children,
  scroll = true,
  contentStyle,
  edges = ["top"],
  onScroll,
  scrollEventThrottle = 16,
}: SoftScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, contentStyle]}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blobAccent} />
        <View style={styles.blobSoft} />
        <View style={styles.blobWash} />
      </View>
      <SafeAreaView style={styles.safe} edges={edges}>
        {body}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  blobAccent: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.pastel.lemon,
    opacity: 0.45,
    top: -110,
    right: -90,
  },
  blobSoft: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surface.card,
    opacity: 0.85,
    top: 260,
    left: -100,
  },
  blobWash: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.pastel.petal,
    opacity: 0.35,
    bottom: -90,
    right: -50,
  },
  safe: { flex: 1 },
  fill: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    flexGrow: 0,
  },
});

import type { ReactNode } from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing } from "@/design-system/tokens";

type SoftScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "right" | "bottom" | "left">;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
};

/** Shared cream + peach atmosphere used across MVP tabs. */
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, contentStyle]}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blobPeach} />
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
    backgroundColor: "#F8EDE6",
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  blobPeach: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(229,155,138,0.26)",
    top: -110,
    right: -90,
  },
  blobSoft: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,248,244,0.88)",
    top: 260,
    left: -100,
  },
  blobWash: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(243,199,188,0.3)",
    bottom: -90,
    right: -50,
  },
  safe: { flex: 1 },
  fill: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});

import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Atmosphere } from "@/design-system/components/Atmosphere";
import { spacing } from "@/design-system/tokens";

type ScreenProps = {
  children: ReactNode;
  padded?: boolean;
  safe?: boolean;
  /** Flat colour override. Passing this opts out of the gradient canvas. */
  background?: string;
  /** `soft` = the bolder full-bleed wash used by auth / onboarding. */
  tone?: "cream" | "soft";
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/**
 * Screen root. The gradient sits UNDER the safe area on purpose — the wash has
 * to run edge to edge behind the status bar, or the notch shows a hard seam.
 */
export function Screen({
  children,
  padded = true,
  safe = true,
  background,
  tone = "cream",
  style,
  contentStyle,
}: ScreenProps) {
  const Container = safe ? SafeAreaView : View;

  const body = (
    <Container style={styles.root}>
      <View style={[styles.content, padded && styles.padded, contentStyle]}>{children}</View>
    </Container>
  );

  if (background) {
    return <View style={[styles.root, { backgroundColor: background }, style]}>{body}</View>;
  }

  return (
    <Atmosphere variant={tone} style={style}>
      {body}
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.lg,
  },
});

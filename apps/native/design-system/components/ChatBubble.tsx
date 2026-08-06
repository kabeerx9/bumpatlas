import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, shadows, spacing } from "@/design-system/tokens";

type ChatBubbleProps = {
  children: string;
  /** `them` = white, squared top-left. `you` = honey, squared top-right. */
  from: "you" | "them";
};

/**
 * One squared corner on the sender's side is what makes these read as a
 * conversation rather than a stack of cards. Everything else stays `lg`.
 */
export function ChatBubble({ children, from }: ChatBubbleProps) {
  const theme = useAppTheme();
  const mine = from === "you";

  return (
    <View
      style={[
        styles.base,
        mine ? styles.mine : styles.theirs,
        mine
          ? { backgroundColor: theme.colors.secondary }
          : [shadows.soft, { backgroundColor: theme.colors.surface }],
      ]}
    >
      <AppText
        variant="bodySmall"
        weight={mine ? "semibold" : "regular"}
        tone={mine ? "primary" : "secondary"}
        style={styles.text}
      >
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    maxWidth: "82%",
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.md,
  },
  theirs: {
    alignSelf: "flex-start",
    borderTopLeftRadius: spacing.xs,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  mine: {
    alignSelf: "flex-end",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: spacing.xs,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  text: {
    lineHeight: 20,
  },
});

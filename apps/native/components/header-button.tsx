import FontAwesome from "@expo/vector-icons/FontAwesome";
import { forwardRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { borderWidth, radius, shadows, spacing } from "@/design-system";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export const HeaderButton = forwardRef<View, { onPress?: () => void }>(({ onPress }, ref) => {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {({ pressed }) => (
        <FontAwesome
          name="info-circle"
          size={18}
          color={theme.text}
          style={{
            opacity: pressed ? 0.7 : 1,
          }}
        />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    ...shadows.soft,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/design-system";
import { borderWidth, colors, layout, radius, shadows, spacing } from "@/design-system/tokens";

type IconName = ComponentProps<typeof Feather>["name"];

const tabIcons: Record<string, IconName> = {
  index: "sun",
  journey: "book-open",
  connect: "users",
  guide: "compass",
  family: "home",
};

// Structural subset of @react-navigation/bottom-tabs' BottomTabBarProps —
// it's not a direct dependency, so we can't import the type under pnpm.
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

/** Floating pill of circular tab bubbles; the active tab is an ink bubble. */
function BubbleTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isDark = theme.colorScheme === "dark";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View
        style={[
          styles.pill,
          shadows.card,
          {
            backgroundColor: isDark ? theme.colors.surfaceElevated : colors.surface.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icon = tabIcons[route.name] ?? "circle";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.title ?? route.name}
              onPress={onPress}
              style={({ pressed }) => [
                styles.bubble,
                isFocused && {
                  backgroundColor: isDark ? colors.brand.honey : colors.brand.ink,
                },
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={icon}
                size={layout.icon.tab}
                color={
                  isFocused
                    ? isDark
                      ? colors.brand.ink
                      : colors.brand.butter
                    : theme.colors.textMuted
                }
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => <BubbleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="journey" options={{ title: "Journey" }} />
      <Tabs.Screen name="connect" options={{ title: "Connect" }} />
      <Tabs.Screen name="guide" options={{ title: "Guide" }} />
      <Tabs.Screen name="family" options={{ title: "Family" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});

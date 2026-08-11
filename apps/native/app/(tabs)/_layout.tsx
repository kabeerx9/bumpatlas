import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, useAppTheme } from "@/design-system";
import { layout, radius, shadows, spacing } from "@/design-system/tokens";

type IconName = ComponentProps<typeof Feather>["name"];

const tabIcons: Record<string, IconName> = {
  index: "home",
  journey: "award",
  connect: "users",
  guide: "compass",
  family: "user",
  testing: "maximize-2",
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

/**
 * Soft Atlas tab bar: a white sheet anchored to the bottom, rounded on its
 * top corners only, inset 8pt from each edge so the gradient canvas shows
 * down both sides. Icon over label, ink when active, faint when not.
 *
 * It overlays content rather than reserving space, so every scrollable tab
 * screen must pad its content by `layout.tabBarScrollPadding`.
 */
function SoftTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.sheet,
        shadows.tabBar,
        {
          backgroundColor: theme.colors.surface,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = tabIcons[route.name] ?? "circle";
        const label = options.title ?? route.name;
        const tint = isFocused ? theme.colors.text : theme.colors.textFaint;

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
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Feather name={icon} size={layout.icon.tab - 2} color={tint} />
            <AppText
              variant="label"
              weight={isFocused ? "bold" : "medium"}
              numberOfLines={1}
              style={[styles.label, { color: tint }]}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MainTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <SoftTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Transparent so each screen's gradient canvas runs edge to edge.
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="journey" options={{ title: "Journey" }} />
      <Tabs.Screen name="connect" options={{ title: "Connect" }} />
      <Tabs.Screen name="guide" options={{ title: "Guide" }} />
      <Tabs.Screen name="family" options={{ title: "Family" }} />
      <Tabs.Screen name="testing" options={{ title: "Testing" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    flexDirection: "row",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.md - 2,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
  },
  label: {
    marginTop: 3,
    letterSpacing: 0,
    textTransform: "none",
  },
  pressed: {
    opacity: 0.6,
  },
});

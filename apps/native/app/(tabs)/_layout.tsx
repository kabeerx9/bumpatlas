import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { colors } from "@/design-system";

type IconName = ComponentProps<typeof Feather>["name"];

function TabIcon({ color, name }: { color: ColorValue; name: IconName }) {
  return <Feather name={name} size={20} color={color} />;
}

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.peach,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.94)",
          borderTopColor: colors.border.hairline,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <TabIcon name="sun" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ color }) => <TabIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color }) => <TabIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: "Guide",
          tabBarIcon: ({ color }) => <TabIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
    </Tabs>
  );
}

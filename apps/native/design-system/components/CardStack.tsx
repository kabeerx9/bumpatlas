import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/design-system/tokens";

type CardStackProps = {
  children: ReactNode;
  /** Pastel edge colors, top-most first. Defaults to petal / mint / lemon. */
  edges?: readonly string[];
  /** Vertical distance each edge peeks out below the card. */
  offset?: number;
  radiusSize?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
};

/**
 * Signature element: a hero card resting on a fanned deck of pastel
 * cards peeking out beneath it. Wrap exactly one card-shaped child.
 */
export function CardStack({
  children,
  edges = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon],
  offset = 6,
  radiusSize = "xl",
  style,
}: CardStackProps) {
  return (
    <View style={[{ paddingBottom: offset * edges.length }, style]}>
      {edges.map((edgeColor, index) => (
        <View
          key={`${edgeColor}-${index}`}
          pointerEvents="none"
          style={[
            styles.edge,
            {
              backgroundColor: edgeColor,
              borderRadius: radius[radiusSize],
              zIndex: -1 - index,
              bottom: offset * (edges.length - 1 - index),
              left: 10 * (index + 1),
              right: 10 * (index + 1),
              height: 48 + offset * (edges.length - index),
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: "absolute",
  },
});

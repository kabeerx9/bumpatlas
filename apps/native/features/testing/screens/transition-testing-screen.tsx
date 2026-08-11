import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import {
  AppText,
  Button,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import {
  interpolateFrame,
  type Frame,
} from "@/features/testing/lib/transition-geometry";

const keepsakeImage = require("../../../assets/onboarding/expecting-keepsake.png") as ImageSourcePropType;

type TransitionPhase = "closed" | "measuring" | "opening" | "open" | "closing";

function measureView(view: View | null) {
  return new Promise<Frame | null>((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }

    view.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

function relativeToRoot(frame: Frame, root: Frame): Frame {
  return {
    x: frame.x - root.x,
    y: frame.y - root.y,
    width: frame.width,
    height: frame.height,
  };
}

export function TransitionTestingScreen() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const rootRef = useRef<View>(null);
  const sourceRef = useRef<View>(null);
  const destinationRef = useRef<View>(null);
  const sourceFrameRef = useRef<Frame | null>(null);
  const didMeasureDestination = useRef(false);
  const mounted = useRef(true);

  const [phase, setPhase] = useState<TransitionPhase>("closed");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [morphEnabled, setMorphEnabled] = useState(false);

  const progress = useSharedValue(0);
  const fromX = useSharedValue(0);
  const fromY = useSharedValue(0);
  const fromWidth = useSharedValue(1);
  const fromHeight = useSharedValue(1);
  const toX = useSharedValue(0);
  const toY = useSharedValue(0);
  const toWidth = useSharedValue(1);
  const toHeight = useSharedValue(1);

  const sheetHeight = Math.min(500, Math.max(420, windowHeight * 0.56));
  const interactionLocked = phase !== "closed" && phase !== "open";

  const finishOpening = useCallback(() => {
    if (!mounted.current) return;
    setOverlayVisible(false);
    setPhase("open");
  }, []);

  const finishClosing = useCallback(() => {
    if (!mounted.current) return;
    setOverlayVisible(false);
    setSheetVisible(false);
    setMorphEnabled(false);
    sourceFrameRef.current = null;
    setPhase("closed");
  }, []);

  useEffect(() => {
    return () => {
      mounted.current = false;
      cancelAnimation(progress);
    };
  }, [progress]);

  const startOpeningAnimation = useCallback(
    (canMorph: boolean) => {
      setMorphEnabled(canMorph);
      setOverlayVisible(canMorph);
      setPhase("opening");
      progress.value = 0;
      progress.value = withTiming(
        1,
        {
          duration: canMorph ? 520 : 180,
          easing: Easing.bezier(0.22, 0.78, 0.2, 1),
        },
        (finished) => {
          "worklet";
          if (finished) scheduleOnRN(finishOpening);
        },
      );
    },
    [finishOpening, progress],
  );

  const openSheet = useCallback(async () => {
    if (phase !== "closed") return;

    setPhase("measuring");
    didMeasureDestination.current = false;

    const [rootFrame, sourceFrame] = await Promise.all([
      measureView(rootRef.current),
      measureView(sourceRef.current),
    ]);

    if (!mounted.current) return;

    if (rootFrame && sourceFrame) {
      const relativeSource = relativeToRoot(sourceFrame, rootFrame);
      sourceFrameRef.current = relativeSource;
      fromX.value = relativeSource.x;
      fromY.value = relativeSource.y;
      fromWidth.value = relativeSource.width;
      fromHeight.value = relativeSource.height;
    } else {
      sourceFrameRef.current = null;
    }

    setSheetVisible(true);
  }, [fromHeight, fromWidth, fromX, fromY, phase]);

  const measureDestinationAndOpen = useCallback(async () => {
    if (phase !== "measuring" || didMeasureDestination.current) return;
    didMeasureDestination.current = true;

    const [rootFrame, destinationFrame] = await Promise.all([
      measureView(rootRef.current),
      measureView(destinationRef.current),
    ]);

    if (!mounted.current) return;

    const canMorph = Boolean(rootFrame && destinationFrame && sourceFrameRef.current && !reduceMotion);
    if (rootFrame && destinationFrame) {
      const relativeDestination = relativeToRoot(destinationFrame, rootFrame);
      toX.value = relativeDestination.x;
      toY.value = relativeDestination.y;
      toWidth.value = relativeDestination.width;
      toHeight.value = relativeDestination.height;
    }

    startOpeningAnimation(canMorph);
  }, [phase, reduceMotion, startOpeningAnimation, toHeight, toWidth, toX, toY]);

  const closeSheet = useCallback(() => {
    if (phase !== "open") return;

    setPhase("closing");
    setOverlayVisible(morphEnabled);
    progress.value = withTiming(
      0,
      {
        duration: morphEnabled ? 440 : 160,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      },
      (finished) => {
        "worklet";
        if (finished) scheduleOnRN(finishClosing);
      },
    );
  }, [finishClosing, morphEnabled, phase, progress]);

  const overlayStyle = useAnimatedStyle(() => {
    const frame = interpolateFrame(
      { x: fromX.value, y: fromY.value, width: fromWidth.value, height: fromHeight.value },
      { x: toX.value, y: toY.value, width: toWidth.value, height: toHeight.value },
      progress.value,
    );

    return {
      left: frame.x,
      top: frame.y,
      width: frame.width,
      height: frame.height,
      borderRadius: radius.xl + (radius.md - radius.xl) * progress.value,
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.34,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: (1 - progress.value) * 32 }],
  }));

  return (
    <SoftScreen scroll={false}>
      <View ref={rootRef} style={styles.root} collapsable={false}>
        <View
          style={styles.content}
          accessibilityElementsHidden={sheetVisible}
          importantForAccessibility={sheetVisible ? "no-hide-descendants" : "auto"}
        >
          <View style={styles.heading}>
            <AppText variant="label" tone="brand" weight="bold">
              Motion lab
            </AppText>
            <AppText variant="hero" weight="bold">
              One memory, one continuous move.
            </AppText>
            <AppText variant="body" tone="secondary">
              The image below stays visually connected as the detail sheet opens and closes.
            </AppText>
          </View>

          <View style={[styles.card, shadows.card, { backgroundColor: theme.colors.surface }]}>
            <View ref={sourceRef} collapsable={false} style={styles.sourceFrame}>
              <Image
                source={keepsakeImage}
                resizeMode="cover"
                style={[styles.image, phase !== "closed" && phase !== "measuring" && styles.hidden]}
                accessibilityLabel="Ultrasound keepsake"
              />
            </View>
            <View style={styles.cardCopy}>
              <View style={styles.cardLabelRow}>
                <View style={styles.dot} />
                <AppText variant="label" tone="tertiary" weight="semibold">
                  First glimpse
                </AppText>
              </View>
              <AppText variant="title" weight="bold">
                The day everything felt real
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                A small keepsake can become the beginning of a much larger family story.
              </AppText>
              <Button onPress={openSheet} disabled={phase !== "closed"}>
                Open sheet
              </Button>
            </View>
          </View>
        </View>

        {sheetVisible ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close transition sheet"
              onPress={closeSheet}
              disabled={interactionLocked}
              style={StyleSheet.absoluteFill}
            >
              <Animated.View style={[styles.backdrop, backdropStyle]} />
            </Pressable>

            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                shadows.tabBar,
                {
                  backgroundColor: theme.colors.surface,
                  height: sheetHeight,
                },
                sheetStyle,
              ]}
            >
              <View style={styles.grabber} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close transition sheet"
                onPress={closeSheet}
                disabled={interactionLocked}
                hitSlop={layout.hitSlop}
                style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
              >
                <Feather name="x" size={20} color={theme.colors.text} />
              </Pressable>

              <View
                ref={destinationRef}
                collapsable={false}
                onLayout={() => {
                  requestAnimationFrame(() => void measureDestinationAndOpen());
                }}
                style={styles.destinationFrame}
              >
                <Image
                  source={keepsakeImage}
                  resizeMode="cover"
                  style={[
                    styles.image,
                    morphEnabled && phase !== "open" ? styles.hidden : undefined,
                  ]}
                  accessibilityLabel="Ultrasound keepsake expanded"
                />
              </View>

              <View style={styles.sheetCopy}>
                <AppText variant="label" tone="brand" weight="bold">
                  A memory in motion
                </AppText>
                <AppText variant="heading" weight="bold">
                  The same moment, with room to breathe.
                </AppText>
                <AppText variant="body" tone="secondary">
                  This is a measured shared-image transition: the original frame becomes the sheet hero without a visual cut.
                </AppText>
              </View>
            </Animated.View>

            {overlayVisible ? (
              <Animated.Image
                source={keepsakeImage}
                resizeMode="cover"
                style={[styles.overlayImage, shadows.card, overlayStyle]}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xl,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl,
  },
  heading: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  sourceFrame: {
    height: 214,
    overflow: "hidden",
    backgroundColor: colors.surface.warm,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  hidden: {
    opacity: 0,
  },
  cardCopy: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.brand.honey,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface.dark,
  },
  sheet: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: layout.tabBarHeight + spacing.lg,
    borderRadius: radius.sheet,
    padding: spacing.md,
    zIndex: 2,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.warm,
    marginBottom: spacing.sm,
  },
  closeButton: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    zIndex: 3,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  closePressed: {
    opacity: 0.72,
  },
  destinationFrame: {
    height: 220,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface.warm,
  },
  sheetCopy: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  overlayImage: {
    position: "absolute",
    zIndex: 4,
    overflow: "hidden",
  },
});

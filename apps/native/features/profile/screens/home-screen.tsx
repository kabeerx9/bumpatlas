import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  AppText,
  BrandWordmark,
  Button,
  Screen,
  colors,
  radius,
  shadows,
  spacing,
} from "@/design-system";

type SwipeDirection = "left" | "right";
type SwipeResult = "pass" | "fail";

type SwipeCard = {
  id: number;
  area: string;
  title: string;
  subtitle: string;
  detail: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.28;
const OFFSCREEN_DISTANCE = screenWidth + 120;

const swipeCards: SwipeCard[] = [
  {
    id: 1,
    area: "Downtown",
    title: "Late coffee walk",
    subtitle: "Three small stops within 18 minutes.",
    detail: "A compact evening route with a cafe, a mural, and a quiet corner to sit.",
    stats: [
      { label: "Time", value: "18m" },
      { label: "Stops", value: "3" },
      { label: "Mood", value: "Calm" },
    ],
  },
  {
    id: 2,
    area: "Old Town",
    title: "Architecture loop",
    subtitle: "Short path with high signal landmarks.",
    detail: "Best for a focused walk when the user wants interesting details, not a long tour.",
    stats: [
      { label: "Time", value: "32m" },
      { label: "Stops", value: "5" },
      { label: "Mood", value: "Curious" },
    ],
  },
  {
    id: 3,
    area: "Riverside",
    title: "Waterfront reset",
    subtitle: "Low effort route with open views.",
    detail: "A relaxed set of recommendations for fresh air, snacks, and a scenic pause.",
    stats: [
      { label: "Time", value: "24m" },
      { label: "Stops", value: "4" },
      { label: "Mood", value: "Open" },
    ],
  },
  {
    id: 4,
    area: "Market",
    title: "Street food crawl",
    subtitle: "Fast choices near the busiest blocks.",
    detail: "Designed for quick decisions when the user wants dinner ideas without planning.",
    stats: [
      { label: "Time", value: "41m" },
      { label: "Stops", value: "6" },
      { label: "Mood", value: "Hungry" },
    ],
  },
  {
    id: 5,
    area: "Arts District",
    title: "Gallery sprint",
    subtitle: "A dense route for visual discovery.",
    detail: "Mixes public art, small galleries, and one break point between stops.",
    stats: [
      { label: "Time", value: "36m" },
      { label: "Stops", value: "5" },
      { label: "Mood", value: "Bright" },
    ],
  },
  {
    id: 6,
    area: "Garden Row",
    title: "Quiet morning",
    subtitle: "Soft start with shade and breakfast.",
    detail: "Useful when the app needs to suggest something gentle and nearby.",
    stats: [
      { label: "Time", value: "27m" },
      { label: "Stops", value: "4" },
      { label: "Mood", value: "Fresh" },
    ],
  },
  {
    id: 7,
    area: "University",
    title: "Bookshop trail",
    subtitle: "Independent shops with a snack break.",
    detail: "A recommendation card that could map nicely to saves, likes, or itinerary adds.",
    stats: [
      { label: "Time", value: "45m" },
      { label: "Stops", value: "5" },
      { label: "Mood", value: "Slow" },
    ],
  },
  {
    id: 8,
    area: "Harbor",
    title: "Sunset bites",
    subtitle: "Food-first route near the water.",
    detail: "Good candidate for right-swipe intent because the choice is clear and actionable.",
    stats: [
      { label: "Time", value: "52m" },
      { label: "Stops", value: "6" },
      { label: "Mood", value: "Social" },
    ],
  },
  {
    id: 9,
    area: "Museum Mile",
    title: "Rainy day plan",
    subtitle: "Indoor-heavy recommendations.",
    detail: "A backup itinerary that can be promoted when weather or time changes.",
    stats: [
      { label: "Time", value: "58m" },
      { label: "Stops", value: "4" },
      { label: "Mood", value: "Sheltered" },
    ],
  },
  {
    id: 10,
    area: "Night Market",
    title: "After-dark picks",
    subtitle: "Bright stops for a late route.",
    detail: "The final card keeps the same behavior as the production deck should have.",
    stats: [
      { label: "Time", value: "39m" },
      { label: "Stops", value: "5" },
      { label: "Mood", value: "Lively" },
    ],
  },
];

function getSwipeResult(direction: SwipeDirection): SwipeResult {
  return direction === "right" ? "pass" : "fail";
}

function shouldCompleteSwipe(gesture: PanResponderGestureState) {
  return Math.abs(gesture.dx) > SWIPE_THRESHOLD || Math.abs(gesture.vx) > 0.72;
}

export function LaunchHomeScreen() {
  return (
    <Screen>
      <View style={styles.launchRoot}>
        <LogoMark />
        <BrandWordmark size="lg" />
      </View>
    </Screen>
  );
}

function LogoMark() {
  return (
    <View accessibilityLabel="BumpAtlas logo" style={styles.logoBadge}>
      <View style={[styles.logoBuilding, styles.logoBuildingLeft]} />
      <View style={[styles.logoBuilding, styles.logoBuildingCenter]} />
      <View style={[styles.logoBuilding, styles.logoBuildingRight]} />
      <View style={styles.logoBase} />
      <View style={styles.logoDot} />
    </View>
  );
}

export function HomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [result, setResult] = useState<SwipeResult | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const resultProgress = useRef(new Animated.Value(0)).current;
  const transitionLocked = useRef(false);

  const activeCard = swipeCards[activeIndex];
  const nextCard = swipeCards[activeIndex + 1];
  const hasCards = activeIndex < swipeCards.length;

  const resetPan = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [pan]);

  const advanceDeck = useCallback(() => {
    resetPan();
    setResult(null);
    transitionLocked.current = false;
    setActiveIndex((currentIndex) => Math.min(currentIndex + 1, swipeCards.length));
  }, [resetPan]);

  const revealDecision = useCallback(
    (direction: SwipeDirection) => {
      setResult(getSwipeResult(direction));
      resultProgress.setValue(0);

      Animated.sequence([
        Animated.spring(resultProgress, {
          toValue: 1,
          bounciness: 8,
          speed: 14,
          useNativeDriver: true,
        }),
        Animated.delay(520),
        Animated.timing(resultProgress, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(advanceDeck);
    },
    [advanceDeck, resultProgress],
  );

  const restoreCard = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      bounciness: 9,
      speed: 15,
      useNativeDriver: false,
    }).start();
  }, [pan]);

  const flingCard = useCallback(
    (direction: SwipeDirection, y = 0) => {
      if (transitionLocked.current || !hasCards) {
        return;
      }

      transitionLocked.current = true;

      Animated.timing(pan, {
        toValue: {
          x: direction === "right" ? OFFSCREEN_DISTANCE : -OFFSCREEN_DISTANCE,
          y,
        },
        duration: 220,
        useNativeDriver: false,
      }).start(() => {
        revealDecision(direction);
      });
    },
    [hasCards, pan, revealDecision],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !transitionLocked.current &&
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          if (!shouldCompleteSwipe(gesture)) {
            restoreCard();
            return;
          }

          flingCard(gesture.dx > 0 ? "right" : "left", gesture.dy);
        },
        onPanResponderTerminate: restoreCard,
      }),
    [flingCard, pan.x, pan.y, restoreCard],
  );

  const rotate = pan.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ["-13deg", "0deg", "13deg"],
    extrapolate: "clamp",
  });

  const passCueOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const failCueOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const resultOverlayStyle = {
    opacity: resultProgress.interpolate({
      inputRange: [0, 0.12, 1],
      outputRange: [0, 1, 1],
      extrapolate: "clamp",
    }),
    transform: [
      {
        scale: resultProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.86, 1],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  const activeCardStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
  };

  function resetDeck() {
    resetPan();
    transitionLocked.current = false;
    setResult(null);
    resultProgress.setValue(0);
    setActiveIndex(0);
  }

  return (
    <Screen padded={false}>
      <View style={styles.swipeRoot}>
        <View style={styles.topBar}>
          <AppText variant="bodySmall" weight="semibold">
            Swipe logic prototype
          </AppText>
          <AppText variant="caption" tone="secondary" style={styles.counter}>
            {Math.min(activeIndex + 1, swipeCards.length)} / {swipeCards.length}
          </AppText>
        </View>

        {hasCards && activeCard ? (
          <View style={styles.cardStack}>
            {nextCard ? <SwipeDeckCard card={nextCard} style={styles.nextCard} /> : null}
            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.animatedCard, activeCardStyle]}
            >
              <SwipeDeckCard card={activeCard} />
              <Animated.View style={[styles.swipeCue, styles.passCue, { opacity: passCueOpacity }]}>
                <AppText variant="heading">
                  PASS
                </AppText>
              </Animated.View>
              <Animated.View style={[styles.swipeCue, styles.failCue, { opacity: failCueOpacity }]}>
                <AppText variant="heading">
                  FAIL
                </AppText>
              </Animated.View>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.doneState}>
            <AppText variant="hero" align="center">
              Deck complete
            </AppText>
            <AppText variant="body" tone="secondary" align="center" style={styles.doneCopy}>
              All ten cards went through the same swipe path. Reset to run the logic again.
            </AppText>
            <Button onPress={resetDeck} variant="ghost" size="lg">
              Reset cards
            </Button>
          </View>
        )}

        {hasCards ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fail current card"
              onPress={() => flingCard("left")}
              style={[styles.actionButton, styles.failAction]}
            >
              <AppText variant="title">
                FAIL
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pass current card"
              onPress={() => flingCard("right")}
              style={[styles.actionButton, styles.passAction]}
            >
              <AppText variant="title">
                PASS
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {result ? (
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.resultOverlay,
              result === "pass" ? styles.passOverlay : styles.failOverlay,
              resultOverlayStyle,
            ]}
          >
            <View style={styles.resultBadge}>
              <AppText variant="hero" align="center">
                {result.toUpperCase()}
              </AppText>
              <AppText variant="body" tone="secondary" align="center">
                {result === "pass" ? "Right swipe accepted" : "Left swipe rejected"}
              </AppText>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}

function SwipeDeckCard({
  card,
  style,
}: {
  card: SwipeCard;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.areaPill}>
          <AppText variant="caption" weight="bold" style={styles.areaText}>
            {card.area}
          </AppText>
        </View>
        <AppText variant="caption" tone="secondary">
          Card {card.id}
        </AppText>
      </View>

      <View style={styles.cardCopy}>
        <AppText variant="hero">
          {card.title}
        </AppText>
        <AppText variant="subhead" tone="secondary" style={styles.subtitle}>
          {card.subtitle}
        </AppText>
        <AppText variant="body" tone="secondary" style={styles.detail}>
          {card.detail}
        </AppText>
      </View>

      <View style={styles.statsRow}>
        {card.stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <AppText variant="caption" tone="secondary" style={styles.statLabel}>
              {stat.label}
            </AppText>
            <AppText variant="title">
              {stat.value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeRoot: {
    flex: 1,
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  topBar: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  counter: {
    opacity: 0.72,
  },
  cardStack: {
    flex: 1,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  animatedCard: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    flex: 1,
    justifyContent: "space-between",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing.xl,
    overflow: "hidden",
    ...shadows.card,
  },
  nextCard: {
    transform: [{ scale: 0.96 }, { translateY: 14 }],
    opacity: 0.45,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  areaPill: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.cool,
    paddingHorizontal: spacing.md,
  },
  areaText: {
    color: colors.text.primary,
  },
  cardCopy: {
    gap: spacing.md,
  },
  subtitle: {
    opacity: 0.84,
  },
  detail: {
    maxWidth: 310,
    opacity: 0.72,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    minHeight: 78,
    justifyContent: "space-between",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.warm,
    padding: spacing.md,
  },
  statLabel: {
    opacity: 0.68,
  },
  swipeCue: {
    position: "absolute",
    top: spacing.xl,
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  passCue: {
    right: spacing.xl,
    borderColor: colors.border.subtle,
    backgroundColor: "rgba(255,255,255,0.92)",
    transform: [{ rotate: "10deg" }],
  },
  failCue: {
    left: spacing.xl,
    borderColor: colors.border.subtle,
    backgroundColor: "rgba(255,255,255,0.92)",
    transform: [{ rotate: "-10deg" }],
  },
  actionRow: {
    minHeight: 72,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  actionButton: {
    minWidth: 116,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  failAction: {
    backgroundColor: colors.surface.card,
  },
  passAction: {
    backgroundColor: colors.surface.card,
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  passOverlay: {
    backgroundColor: "rgba(250,250,248,0.96)",
  },
  failOverlay: {
    backgroundColor: "rgba(250,250,248,0.96)",
  },
  resultBadge: {
    minWidth: 220,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  doneState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  doneCopy: {
    maxWidth: 300,
    opacity: 0.72,
  },
  launchRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  logoBadge: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    ...shadows.soft,
  },
  logoBuilding: {
    position: "absolute",
    bottom: 42,
    width: 16,
    borderRadius: radius.xs,
    backgroundColor: colors.text.primary,
  },
  logoBuildingLeft: {
    left: 45,
    height: 34,
  },
  logoBuildingCenter: {
    left: 64,
    height: 52,
  },
  logoBuildingRight: {
    left: 83,
    height: 28,
  },
  logoBase: {
    position: "absolute",
    bottom: 32,
    width: 62,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.text.primary,
  },
  logoDot: {
    position: "absolute",
    top: 35,
    right: 41,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.brand.mint,
  },
});

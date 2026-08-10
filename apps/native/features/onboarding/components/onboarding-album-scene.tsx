import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";
import {
  ALBUM_LAYER_ORDER,
  resolveAlbumSceneHeight,
  resolveBoundArtifactFrame,
} from "@/features/onboarding/lib/album-scene-model";
import type {
  AlbumSceneModel,
  AlbumStage,
  ArtifactKey,
} from "@/features/onboarding/lib/album-scene-model";

const ARTIFACTS = {
  unselected: require("../../../assets/onboarding/expecting-keepsake.png"),
  expecting: require("../../../assets/onboarding/expecting-keepsake.png"),
  parent: require("../../../assets/onboarding/parent-keepsake.png"),
  caregiver: require("../../../assets/onboarding/caregiver-keepsake.png"),
} satisfies Record<ArtifactKey, number>;

const STAGE_VALUE: Record<AlbumStage, number> = {
  welcome: 0,
  privacy: 1,
  role: 2,
  household: 3,
  profile: 4,
  goal: 5,
  notifications: 6,
  invite: 7,
  complete: 8,
};

const CHAPTERS = [
  { id: "memories", short: "MEMORIES", title: "Capture a memory" },
  { id: "wellness", short: "CARE", title: "A moment for you" },
  { id: "learn", short: "GUIDE", title: "What matters now" },
  { id: "connect", short: "CONNECT", title: "Your circle" },
] as const;

const BOUND_ARTIFACT_FRAME = resolveBoundArtifactFrame({ width: 152, height: 174 });

type OnboardingAlbumSceneProps = {
  model: AlbumSceneModel;
};

export function OnboardingAlbumScene({ model }: OnboardingAlbumSceneProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(STAGE_VALUE[model.stage]);

  useEffect(() => {
    const next = STAGE_VALUE[model.stage];
    progress.value = reduceMotion
      ? next
      : withTiming(next, {
          duration: model.stage === "complete" ? 460 : 360,
          easing: Easing.bezier(0.22, 0.74, 0.2, 1),
        });
  }, [model.direction, model.stage, progress, reduceMotion]);

  const leftPageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [3.8, 4.4, 5], [1, 0.55, 0], Extrapolation.CLAMP),
    transform: [
      { perspective: 800 },
      { translateX: interpolate(progress.value, [3.8, 5], [0, -105], Extrapolation.CLAMP) },
      { rotateY: `${interpolate(progress.value, [0, 4, 5], [4, 8, 15], Extrapolation.CLAMP)}deg` },
      { scale: interpolate(progress.value, [3.8, 5], [1, 0.84], Extrapolation.CLAMP) },
    ],
  }));

  const activePageStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [4, 5], [8, 3], Extrapolation.CLAMP),
    transform: [
      { perspective: 800 },
      { translateX: interpolate(progress.value, [3, 4, 5, 8], [0, -24, -82, -83], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [4, 5, 8], [0, -2, 0], Extrapolation.CLAMP) },
      { scaleX: interpolate(progress.value, [3, 4, 5, 8], [1, 1.18, 1.56, 1.56], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [4, 5, 8], [1, 1.03, 1.03], Extrapolation.CLAMP) },
      { rotateY: `${interpolate(progress.value, [0, 4, 5], [-4, -2, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const foldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [3.8, 4.6, 5], [1, 0.5, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [3.8, 5], [0, -82], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [3.8, 5], [1, 0.86], Extrapolation.CLAMP) },
    ],
  }));

  const artifactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [4.3, 4.85], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 2, 3, 4, 5, 7, 8],
          [205, 203, 202, 200, 43, 36, 29],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 3, 4, 5, 7, 8],
          [27, 27, 24, 22, 35, 38],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 3, 4, 5, 7, 8],
          [0.86, 0.88, 1, 0.72, 0.67, 0.54],
          Extrapolation.CLAMP,
        ),
      },
      { rotate: `${interpolate(progress.value, [0, 3, 4, 5, 8], [-2, -1, 0, -2, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const boundArtifactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [4.1, 4.55], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 3, 4], [3, 1, -2], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 3, 4], [1, 1, 1.04], Extrapolation.CLAMP) },
      { rotate: `${interpolate(progress.value, [0, 3, 4], [-2, -1, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const threadStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [2.5, 3, 7.8, 8], [0, 0.82, 0.82, 0.35], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [4, 5], [0, -7], Extrapolation.CLAMP) },
      { rotate: `${interpolate(progress.value, [3, 5, 7], [8, -6, 4], Extrapolation.CLAMP)}deg` },
      { scaleX: interpolate(progress.value, [2.5, 3.4, 7], [0.08, 0.78, 1], Extrapolation.CLAMP) },
    ],
  }));

  const householdStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 2.5, 3, 3.75, 4], [0.82, 0.82, 1, 0.3, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [3.4, 4], [0, -10], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [3.4, 4], [0, -5], Extrapolation.CLAMP) },
    ],
  }));

  const profileStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [4.6, 5, 7.6, 8], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [4.6, 5], [10, 0], Extrapolation.CLAMP) },
    ],
  }));

  const focusNoteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [3.55, 4, 4.35, 4.65], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [3.55, 4], [7, 0], Extrapolation.CLAMP) }],
  }));

  const chaptersStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [4.65, 5.1, 7.7, 8], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(progress.value, [4.65, 5.1], [13, 0], Extrapolation.CLAMP) }],
  }));

  const inviteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [6.6, 7, 7.8, 8], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [6.6, 7.1], [0.94, 1], Extrapolation.CLAMP) }],
  }));

  const completionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [7.55, 8], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [7.55, 8], [10, 0], Extrapolation.CLAMP) }],
  }));

  const selectedChapter = CHAPTERS.find((chapter) => chapter.id === model.chapter);
  const compact = model.phase === "editorial" || model.phase === "today";
  const sceneHeight = resolveAlbumSceneHeight(model.phase);

  return (
    <View
      style={[styles.scene, { height: sceneHeight }]}
      accessibilityLabel={`Your family album preview. ${model.profileLabel}`}
    >
      <Animated.View style={[styles.page, compact && styles.pageCompact, styles.leftPage, leftPageStyle]}>
        <View style={styles.paperWash} />
        <Animated.View style={[styles.householdCopy, householdStyle]}>
          <AppText variant="subhead" weight="semibold" numberOfLines={2} style={styles.householdTitle}>
            {model.householdLabel}
          </AppText>
          <AppText variant="caption" tone="tertiary" numberOfLines={3} style={styles.householdNote}>
            A private place for the story you are beginning.
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.focusNote, focusNoteStyle]}>
          <AppText variant="label" tone="brand">KEEPSAKE</AppText>
          <AppText variant="caption" weight="semibold" numberOfLines={2}>
            {model.profileLabel}
          </AppText>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.page, compact && styles.pageCompact, styles.activePage, activePageStyle]}>
        <View style={styles.paperWash} />
        <Animated.View style={[styles.boundArtifact, boundArtifactStyle]}>
          <View style={styles.artifactViewport}>
            <Image source={ARTIFACTS[model.artifact]} style={styles.artifactImage} resizeMode="cover" />
          </View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.foldShadow, foldStyle]} />
      <Animated.View style={[styles.foldHighlight, foldStyle]} />

      <View pointerEvents="none" style={styles.storyLayer}>
        <Animated.View style={[styles.thread, threadStyle]} />

        <Animated.View style={[styles.artifact, artifactStyle]}>
          <View style={styles.artifactViewport}>
            <Image source={ARTIFACTS[model.artifact]} style={styles.artifactImage} resizeMode="cover" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.profileNote, profileStyle]}>
          <AppText variant="label" tone="brand">KEEPSAKE</AppText>
          <AppText variant="caption" weight="semibold" numberOfLines={2}>
            {model.profileLabel}
          </AppText>
        </Animated.View>

        <Animated.View style={[styles.chapters, chaptersStyle]}>
          {CHAPTERS.map((chapter) => {
            const active = model.chapter === chapter.id;
            return (
              <View key={chapter.id} style={[styles.chapterTab, active && styles.chapterTabActive]}>
                <AppText variant="label" style={styles.chapterLabel} numberOfLines={1}>
                  {chapter.short}
                </AppText>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View style={[styles.inviteFrame, inviteStyle]}>
          <View style={styles.inviteInner}>
            <AppText variant="label" tone="tertiary" align="center">THEIR PLACE</AppText>
          </View>
          <View style={styles.ribbonHorizontal} />
          <View style={styles.ribbonKnot} />
        </Animated.View>

        <Animated.View style={[styles.todayCard, completionStyle]}>
          <View style={styles.todayAccent} />
          <View style={styles.todayCopy}>
            <AppText variant="label" tone="brand">{selectedChapter?.short ?? "YOUR CHAPTER"}</AppText>
            <AppText variant="subhead" weight="semibold" numberOfLines={1}>
              {selectedChapter?.title ?? "Your family story starts here"}
            </AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>Ready for your first small moment.</AppText>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    height: 184,
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
    borderRadius: 13,
    backgroundColor: "#7D8875",
    ...shadows.soft,
  },
  page: {
    position: "absolute",
    top: 5,
    width: "47%",
    height: 174,
    overflow: "hidden",
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(122, 94, 62, 0.12)",
    zIndex: ALBUM_LAYER_ORDER.pages,
  },
  pageCompact: { top: 2, height: 152 },
  leftPage: { left: 8, borderTopLeftRadius: 10, borderBottomLeftRadius: 11, borderRadius: 3 },
  activePage: { right: 8, borderTopRightRadius: 10, borderBottomRightRadius: 11, borderRadius: 3 },
  paperWash: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -50,
    top: -58,
    backgroundColor: "rgba(207, 227, 214, 0.28)",
  },
  storyLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: ALBUM_LAYER_ORDER.content,
    elevation: 3,
  },
  foldShadow: {
    position: "absolute",
    left: "49%",
    top: 7,
    width: 8,
    height: 162,
    backgroundColor: "rgba(91, 67, 43, 0.09)",
    zIndex: ALBUM_LAYER_ORDER.fold,
  },
  foldHighlight: {
    position: "absolute",
    left: "50%",
    top: 7,
    width: 2,
    height: 162,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    zIndex: ALBUM_LAYER_ORDER.fold,
  },
  householdCopy: {
    position: "absolute",
    left: 18,
    top: 43,
    width: 112,
    justifyContent: "center",
    gap: 3,
    zIndex: 2,
  },
  householdTitle: { fontSize: 13, lineHeight: 15, color: "#51463B" },
  householdNote: { fontSize: 8, lineHeight: 11, color: "#887B6E" },
  focusNote: {
    position: "absolute",
    left: 13,
    top: 82,
    width: 128,
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.honey,
    backgroundColor: "rgba(255, 253, 248, 0.96)",
    zIndex: 3,
  },
  boundArtifact: {
    position: "absolute",
    left: BOUND_ARTIFACT_FRAME.left,
    top: BOUND_ARTIFACT_FRAME.top,
    width: BOUND_ARTIFACT_FRAME.width,
    height: BOUND_ARTIFACT_FRAME.height,
    padding: 5,
    backgroundColor: "#FFFDF9",
    borderRadius: 4,
    ...shadows.card,
  },
  artifact: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 116,
    height: 138,
    padding: 5,
    backgroundColor: "#FFFDF9",
    borderRadius: 4,
    ...shadows.card,
    zIndex: 2,
    elevation: 2,
  },
  artifactViewport: { flex: 1, overflow: "hidden", borderRadius: 2, backgroundColor: "#E8E0D3" },
  artifactImage: { width: "100%", height: "100%" },
  thread: {
    position: "absolute",
    left: 29,
    top: 57,
    width: 295,
    height: 104,
    borderRadius: 70,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: colors.brand.honeyDeep,
    transformOrigin: "left center",
    zIndex: 0,
  },
  profileNote: {
    position: "absolute",
    left: 169,
    top: 56,
    width: 106,
    gap: 3,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.brand.honey,
  },
  chapters: { position: "absolute", right: -2, top: 34, gap: 5, alignItems: "flex-end", zIndex: ALBUM_LAYER_ORDER.content },
  chapterTab: {
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
    backgroundColor: "#E1E8DD",
  },
  chapterTabActive: { minWidth: 83, backgroundColor: colors.brand.honeySoft },
  chapterLabel: { fontSize: 8, lineHeight: 10, color: colors.text.secondary },
  inviteFrame: {
    position: "absolute",
    right: 35,
    top: 38,
    width: 96,
    height: 104,
    padding: 7,
    backgroundColor: "#F3E8D9",
    zIndex: ALBUM_LAYER_ORDER.content,
    ...shadows.soft,
  },
  inviteInner: { flex: 1, borderWidth: 1, borderColor: "rgba(106, 90, 81, 0.25)", alignItems: "center", justifyContent: "center" },
  ribbonHorizontal: { position: "absolute", left: -4, right: -4, top: 50, height: 12, backgroundColor: "#B87559" },
  ribbonKnot: { position: "absolute", left: 41, top: 47, width: 18, height: 18, borderRadius: 6, backgroundColor: "#9E624B", transform: [{ rotate: "45deg" }] },
  todayCard: {
    position: "absolute",
    left: 91,
    right: 25,
    top: 42,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    flexDirection: "row",
    overflow: "hidden",
    zIndex: ALBUM_LAYER_ORDER.content,
    ...shadows.soft,
  },
  todayAccent: { width: 6, backgroundColor: colors.brand.honey },
  todayCopy: { flex: 1, padding: spacing.md, gap: 2, justifyContent: "center" },
});

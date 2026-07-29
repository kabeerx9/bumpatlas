import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

/** Respects Reduce Motion — skips or shortens animated timings. */
export function useRespectReduceMotion() {
  const reduceMotion = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotion.current = enabled;
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      reduceMotion.current = enabled;
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  function runTiming(
    value: Animated.Value,
    toValue: number,
    duration = 400,
    useNativeDriver = true,
  ) {
    if (reduceMotion.current) {
      value.setValue(toValue);
      return { start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }) };
    }
    return Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
  }

  return { reduceMotion, runTiming };
}

/** Soft scale for dynamic type — caps growth so layouts stay calm. */
export function scaleFont(size: number, fontScale: number) {
  const capped = Math.min(Math.max(fontScale, 1), 1.35);
  return Math.round(size * capped);
}

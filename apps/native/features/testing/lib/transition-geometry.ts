export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function clampProgress(progress: number) {
  "worklet";
  return Math.min(1, Math.max(0, progress));
}

export function interpolateFrame(from: Frame, to: Frame, progress: number): Frame {
  "worklet";
  const clamped = clampProgress(progress);

  return {
    x: from.x + (to.x - from.x) * clamped,
    y: from.y + (to.y - from.y) * clamped,
    width: from.width + (to.width - from.width) * clamped,
    height: from.height + (to.height - from.height) * clamped,
  };
}

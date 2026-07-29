/** Gestational week from due date (40-week convention). Clamped 1–42 for UI. */
export function gestationalWeekFromDueDate(dueDateIso: string, today = new Date()): number {
  const due = new Date(`${dueDateIso}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 1;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / msPerDay);
  const week = Math.floor((280 - daysUntilDue) / 7);
  return Math.min(42, Math.max(1, week));
}

export function trimesterFromWeek(week: number): string {
  if (week < 14) return "First trimester";
  if (week < 28) return "Second trimester";
  return "Third trimester";
}

export function pregnancyWeekLabel(week: number): string {
  return `Week ${week}`;
}

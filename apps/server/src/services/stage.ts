import type { StageMode } from "@bumpatlas/contracts/v1";

/**
 * Internal stage buckets used for content selection. The public contract stays
 * `pregnancy` | `postpartum` | `unknown` so content targeting can be re-tuned
 * without a client release.
 */
export type StageKey =
  | "P_T1"
  | "P_T2"
  | "P_T3"
  | "NB_0_3M"
  | "I_3_6M"
  | "I_6_12M"
  | "T_12_24M"
  | "K_2_6Y"
  | "UNKNOWN";

export type StageComputation = {
  stageMode: StageMode;
  stageKey: StageKey;
  gestationalWeek: number | null;
  dueDate: string | null;
  childId: string | null;
};

export type StageInput = {
  /** Active pregnancy, if any. Wins over children — see below. */
  pregnancy: { dueDate: Date } | null;
  /** The *resolved* active child (§6.2.1), never an arbitrary row. */
  activeChild: { id: string; dateOfBirth: Date } | null;
  /** "Now" in the user's time zone, as a calendar date. */
  today: CalendarDate;
};

export type CalendarDate = { year: number; month: number; day: number };

const MS_PER_DAY = 86_400_000;
/** Clinical convention: 40 weeks from LMP, so conception-to-due is 280 days. */
const GESTATION_DAYS = 280;

/** Calendar-date arithmetic in UTC to avoid DST shifting a day boundary. */
function toUtcMillis(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

export function toCalendarDate(date: Date, timeZone: string | null): CalendarDate {
  // `en-CA` yields YYYY-MM-DD, which parses without locale ambiguity.
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const [year, month, day] = formatted.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

export function dateToCalendarDate(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function formatCalendarDate(date: CalendarDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / MS_PER_DAY);
}

/**
 * Gestational week from a due date, clamped to 1..42.
 *
 * **Completed** weeks, which is what clinicians and every pregnancy app state: 40
 * weeks on the due date, and "21 weeks" for the whole span 21w0d–21w6d. Reporting
 * the ordinal week instead (the 41st week on the due date) is arithmetically
 * defensible and would still read as an off-by-one to every parent comparing this
 * against their midwife.
 *
 * Clamped at both ends: a post-term pregnancy stops at 42 rather than climbing, and
 * an implausibly distant due date reports 1 rather than 0 or a negative week.
 */
export function gestationalWeekFromDueDate(dueDate: CalendarDate, today: CalendarDate): number {
  const daysRemaining = daysBetween(today, dueDate);
  const elapsed = GESTATION_DAYS - daysRemaining;

  return Math.min(42, Math.max(1, Math.floor(elapsed / 7)));
}

function pregnancyStageKey(week: number): StageKey {
  if (week <= 13) return "P_T1";
  if (week <= 27) return "P_T2";
  return "P_T3";
}

function childStageKey(ageInDays: number): StageKey {
  const months = ageInDays / 30.4375;

  if (months < 3) return "NB_0_3M";
  if (months < 6) return "I_3_6M";
  if (months < 12) return "I_6_12M";
  if (months < 24) return "T_12_24M";
  return "K_2_6Y";
}

/**
 * The single stage resolver (§ Phase 1).
 *
 * Pregnancy wins over an existing child, deliberately: a household with a toddler
 * *and* a pregnancy is in the time-sensitive context, and that is what Today should
 * speak to. Nothing may branch on `activeChildId` to decide stage — this function
 * is the only answer.
 *
 * Pure so the boundary dates are unit-testable without a database.
 */
export function computeStage(input: StageInput): StageComputation {
  if (input.pregnancy) {
    const dueDate = dateToCalendarDate(input.pregnancy.dueDate);
    const week = gestationalWeekFromDueDate(dueDate, input.today);

    return {
      stageMode: "pregnancy",
      stageKey: pregnancyStageKey(week),
      gestationalWeek: week,
      dueDate: formatCalendarDate(dueDate),
      // Pregnancy stage is not about a child, even when siblings exist.
      childId: null,
    };
  }

  if (input.activeChild) {
    const birth = dateToCalendarDate(input.activeChild.dateOfBirth);
    const ageInDays = Math.max(0, daysBetween(birth, input.today));

    return {
      stageMode: "postpartum",
      stageKey: childStageKey(ageInDays),
      gestationalWeek: null,
      dueDate: null,
      childId: input.activeChild.id,
    };
  }

  return {
    stageMode: "unknown",
    stageKey: "UNKNOWN",
    gestationalWeek: null,
    dueDate: null,
    childId: null,
  };
}

/**
 * Date formatting for the Soft Atlas screens.
 *
 * Everything here tolerates a null/invalid input and returns a dash rather
 * than throwing or rendering "Invalid Date" — these strings land in timeline
 * rows and card subtitles where a crash or a broken label is worse than a
 * missing one.
 */

const FALLBACK = "—";

function parse(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Nov 18" — timeline entries and due dates. */
export function formatShortDate(value: string | null | undefined) {
  const date = parse(value);
  if (!date) return FALLBACK;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Nov 18, 2026" — when the year genuinely matters (birth date, due date). */
export function formatLongDate(value: string | null | undefined) {
  const date = parse(value);
  if (!date) return FALLBACK;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2h ago" / "5d ago" — community bylines. Falls back to a short date past a week. */
export function formatRelativeTime(value: string | null | undefined, now = Date.now()) {
  const date = parse(value);
  if (!date) return FALLBACK;

  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatShortDate(value);
}

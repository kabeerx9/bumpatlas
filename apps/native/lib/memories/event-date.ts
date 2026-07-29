/**
 * Normalize Capture date chips / free text into an ISO date (YYYY-MM-DD) for the API.
 * Falls back to today when parsing fails.
 */
export function resolveEventDateIso(label: string, customDate = ""): string {
  const today = new Date();
  const normalized = label.trim().toLowerCase();

  if (normalized === "today") return toIsoDate(today);
  if (normalized === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return toIsoDate(d);
  }
  if (normalized === "2 days ago") {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return toIsoDate(d);
  }

  const source = normalized.startsWith("pick") ? customDate.trim() : label.trim();
  if (!source) return toIsoDate(today);

  const parsed = Date.parse(source);
  if (!Number.isNaN(parsed)) return toIsoDate(new Date(parsed));

  // Accept already-canonical YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;

  return toIsoDate(today);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

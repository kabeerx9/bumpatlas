/** A failed/corrupt read is unknown state, never evidence that the queue is empty. */
export function parsePersistedDraftQueue<T>(
  raw: string | null,
  isValid?: (value: unknown) => value is T,
): T[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Persisted draft queue is not an array.");
  }
  if (isValid && !parsed.every(isValid)) {
    throw new Error("Persisted draft queue contains an invalid draft.");
  }
  return parsed as T[];
}

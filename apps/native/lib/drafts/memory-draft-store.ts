import * as FileSystem from "expo-file-system/legacy";

const DRAFTS_FILE = `${FileSystem.documentDirectory ?? ""}bumpatlas-memory-drafts-v1.json`;

const memoryFallback = new Map<string, string>();
const MEMORY_KEY = "drafts";

export type PersistedMemoryDraft = {
  id: string;
  body: string;
  eventDate: string;
  createdAtLabel: string;
  createdAtIso: string;
  hasPhoto: boolean;
  /** Local file URI when a photo was attached offline. */
  photoUri?: string | null;
  visibility: "HOUSEHOLD" | "PRIVATE";
};

async function readRaw(): Promise<string | null> {
  try {
    if (!FileSystem.documentDirectory) {
      return memoryFallback.get(MEMORY_KEY) ?? null;
    }
    const info = await FileSystem.getInfoAsync(DRAFTS_FILE);
    if (!info.exists) return memoryFallback.get(MEMORY_KEY) ?? null;
    return await FileSystem.readAsStringAsync(DRAFTS_FILE);
  } catch {
    return memoryFallback.get(MEMORY_KEY) ?? null;
  }
}

async function writeRaw(raw: string): Promise<void> {
  memoryFallback.set(MEMORY_KEY, raw);
  try {
    if (!FileSystem.documentDirectory) return;
    await FileSystem.writeAsStringAsync(DRAFTS_FILE, raw);
  } catch {
    // Memory fallback already holds the latest queue.
  }
}

export async function loadMemoryDrafts(): Promise<PersistedMemoryDraft[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedMemoryDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMemoryDrafts(drafts: PersistedMemoryDraft[]): Promise<void> {
  await writeRaw(JSON.stringify(drafts));
}

export async function upsertMemoryDraft(
  draft: PersistedMemoryDraft,
): Promise<PersistedMemoryDraft[]> {
  const current = await loadMemoryDrafts();
  const next = [draft, ...current.filter((item) => item.id !== draft.id)];
  await saveMemoryDrafts(next);
  return next;
}

export async function removeMemoryDraft(id: string): Promise<PersistedMemoryDraft[]> {
  const current = await loadMemoryDrafts();
  const next = current.filter((item) => item.id !== id);
  await saveMemoryDrafts(next);
  return next;
}

export async function clearMemoryDrafts(): Promise<void> {
  memoryFallback.delete(MEMORY_KEY);
  try {
    if (!FileSystem.documentDirectory) return;
    const info = await FileSystem.getInfoAsync(DRAFTS_FILE);
    if (info.exists) await FileSystem.deleteAsync(DRAFTS_FILE, { idempotent: true });
  } catch {
    // ignore
  }
}

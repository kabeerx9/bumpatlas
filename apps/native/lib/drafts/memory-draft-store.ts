import * as FileSystem from "expo-file-system/legacy";

import { draftOwnerFileName } from "@/lib/drafts/draft-owner";
import { parsePersistedDraftQueue } from "@/lib/drafts/parse-draft-queue";
import { createSerializedDraftPersistence } from "@/lib/drafts/serialized-draft-persistence";

const memoryFallback = new Map<string, string>();

export type PersistedMemoryDraft = {
  id: string;
  familyId: string;
  body: string;
  eventDate: string;
  createdAtLabel: string;
  createdAtIso: string;
  hasPhoto: boolean;
  /** Local file URI when a photo was attached offline. */
  photoUri?: string | null;
  visibility: "HOUSEHOLD" | "PRIVATE";
};

function isFamilyTargetedDraft(value: unknown): value is PersistedMemoryDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.id === "string" &&
    typeof draft.familyId === "string" &&
    draft.familyId.trim().length > 0
  );
}

type DraftPersistence = {
  load: () => Promise<PersistedMemoryDraft[]>;
  save: (drafts: PersistedMemoryDraft[]) => Promise<void>;
  upsert: (draft: PersistedMemoryDraft) => Promise<PersistedMemoryDraft[]>;
  remove: (id: string) => Promise<PersistedMemoryDraft[]>;
  clear: () => Promise<void>;
};

const ownerPersistence = new Map<string, DraftPersistence>();

function persistenceFor(ownerUserId: string): DraftPersistence {
  const existing = ownerPersistence.get(ownerUserId);
  if (existing) return existing;

  const filePath = `${FileSystem.documentDirectory ?? ""}${draftOwnerFileName(ownerUserId)}`;
  const persistence = createSerializedDraftPersistence<PersistedMemoryDraft>({
    read: async () => {
      let raw: string | null;
      if (!FileSystem.documentDirectory) {
        raw = memoryFallback.get(ownerUserId) ?? null;
      } else {
        const info = await FileSystem.getInfoAsync(filePath);
        raw = info.exists
          ? await FileSystem.readAsStringAsync(filePath)
          : (memoryFallback.get(ownerUserId) ?? null);
      }
      return parsePersistedDraftQueue<PersistedMemoryDraft>(raw, isFamilyTargetedDraft);
    },
    write: async (drafts) => {
      const raw = JSON.stringify(drafts);
      if (!FileSystem.documentDirectory) {
        memoryFallback.set(ownerUserId, raw);
        return;
      }
      // A memory-only success can resurrect an older disk queue on restart.
      await FileSystem.writeAsStringAsync(filePath, raw);
      memoryFallback.set(ownerUserId, raw);
    },
    clear: async () => {
      if (FileSystem.documentDirectory) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
      memoryFallback.delete(ownerUserId);
    },
  });
  ownerPersistence.set(ownerUserId, persistence);
  return persistence;
}

export function loadMemoryDrafts(
  ownerUserId: string,
): Promise<PersistedMemoryDraft[]> {
  return persistenceFor(ownerUserId).load();
}

export function saveMemoryDrafts(
  ownerUserId: string,
  drafts: PersistedMemoryDraft[],
): Promise<void> {
  return persistenceFor(ownerUserId).save(drafts);
}

export async function upsertMemoryDraft(
  ownerUserId: string,
  draft: PersistedMemoryDraft,
): Promise<PersistedMemoryDraft[]> {
  return persistenceFor(ownerUserId).upsert(draft);
}

export function removeMemoryDraft(
  ownerUserId: string,
  id: string,
): Promise<PersistedMemoryDraft[]> {
  return persistenceFor(ownerUserId).remove(id);
}

export function clearMemoryDrafts(ownerUserId: string): Promise<void> {
  return persistenceFor(ownerUserId).clear();
}

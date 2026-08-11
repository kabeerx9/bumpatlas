import { createMemory } from "@/lib/api/memories";
import { removeMemoryDraft, type PersistedMemoryDraft } from "@/lib/drafts/memory-draft-store";
import { resolveEventDateIso } from "@/lib/memories/event-date";

export type FlushableDraft = Pick<
  PersistedMemoryDraft,
  "id" | "familyId" | "body" | "eventDate" | "hasPhoto" | "visibility" | "photoUri"
>;

export type FlushedDraftResult = {
  draftId: string;
  memoryId: string;
  body: string;
  eventDate: string;
  visibility: "HOUSEHOLD" | "PRIVATE";
  hasPhoto: boolean;
};

/** Upload queued offline drafts: POSTs each draft then removes it from persistence. */
export async function flushMemoryDrafts(
  ownerUserId: string,
  drafts: FlushableDraft[],
  ownerAuthToken: string,
): Promise<FlushedDraftResult[]> {
  const flushed: FlushedDraftResult[] = [];

  for (const draft of drafts) {
    if (!draft.body.trim()) continue;
    const eventDateIso = resolveEventDateIso(draft.eventDate);
    const visibility = draft.visibility ?? "HOUSEHOLD";

    // Photos attached offline need a dedicated media retry; text syncs first.
    const memory = await createMemory(
      {
        familyId: draft.familyId,
        body: draft.body,
        eventDate: eventDateIso,
        visibility,
        mediaStorageKey: null,
      },
      `draft-${draft.id}`,
      ownerAuthToken,
    );

    await removeMemoryDraft(ownerUserId, draft.id);
    flushed.push({
      draftId: draft.id,
      memoryId: memory.id,
      body: draft.body,
      eventDate: eventDateIso,
      visibility,
      hasPhoto: draft.hasPhoto,
    });
  }

  return flushed;
}

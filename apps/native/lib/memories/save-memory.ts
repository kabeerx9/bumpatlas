import {
  createMemory,
  getMediaUploadUrl,
  uploadMediaToSignedUrl,
} from "@/lib/api/memories";
import type { PreparedPhoto } from "@/lib/media/pick-and-prepare";
import { resolveEventDateIso } from "@/lib/memories/event-date";

export type SaveMemoryInput = {
  body: string;
  /** Chip label or free-text; normalized to ISO before API write. */
  eventDate: string;
  customDate?: string;
  visibility: "HOUSEHOLD" | "PRIVATE";
  photo?: PreparedPhoto | null;
  idempotencyKey?: string;
};

export type SaveMemoryResult = {
  id: string;
  mediaStorageKey: string | null;
  eventDateIso: string;
};

/** Production capture path: optional signed upload → create memory. */
export async function saveMemoryWithOptionalUpload(
  input: SaveMemoryInput,
): Promise<SaveMemoryResult> {
  const eventDateIso = resolveEventDateIso(input.eventDate, input.customDate);

  let mediaStorageKey: string | null = null;
  if (input.photo) {
    const signed = await getMediaUploadUrl({
      contentType: input.photo.contentType,
      byteSize: input.photo.byteSize,
    });
    await uploadMediaToSignedUrl(
      signed.uploadUrl,
      input.photo.uri,
      input.photo.contentType,
      signed.headers,
    );
    mediaStorageKey = signed.storageKey;
  }

  const memory = await createMemory(
    {
      body: input.body,
      eventDate: eventDateIso,
      visibility: input.visibility,
      mediaStorageKey,
    },
    input.idempotencyKey,
  );

  return { id: memory.id, mediaStorageKey, eventDateIso };
}

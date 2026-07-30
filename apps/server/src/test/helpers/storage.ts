import type { StorageSigner } from "@/services/media";

/**
 * In-memory storage signer.
 *
 * Signing and object deletion are the only parts of the media path that talk to a
 * provider; everything worth testing — quota counting, the pending-then-attached
 * lifecycle, cross-family key rejection — is database work. Faking the provider keeps
 * the suite offline and deterministic.
 */
export function createFakeSigner() {
  const uploaded: string[] = [];
  const deleted: string[] = [];

  const signer: StorageSigner = {
    createUploadUrl: async ({ storageKey, contentType }) => {
      uploaded.push(storageKey);
      return {
        url: `https://storage.test/upload/${encodeURIComponent(storageKey)}`,
        headers: { "Content-Type": contentType },
      };
    },
    createDownloadUrl: async ({ storageKey, expiresInSeconds }) =>
      `https://storage.test/download/${encodeURIComponent(storageKey)}?exp=${expiresInSeconds}`,
    deleteObject: async (storageKey) => {
      deleted.push(storageKey);
    },
  };

  return { signer, uploaded, deleted, getSigner: async () => signer };
}

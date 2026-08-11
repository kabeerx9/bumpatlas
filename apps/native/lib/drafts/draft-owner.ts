const OWNER_FILE_PREFIX = "bumpatlas-memory-drafts-";

/** Clerk IDs are trusted identities, but encoding also prevents path traversal. */
export function draftOwnerFileName(ownerUserId: string): string {
  return `${OWNER_FILE_PREFIX}${encodeURIComponent(ownerUserId)}.json`;
}

export function isDraftQueueReadyForOwner(
  currentOwnerUserId: string | null,
  hydratedOwnerUserId: string | null,
  hydrated: boolean,
): boolean {
  return Boolean(
    hydrated &&
      currentOwnerUserId &&
      hydratedOwnerUserId === currentOwnerUserId,
  );
}

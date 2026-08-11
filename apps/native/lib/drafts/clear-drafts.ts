type DurableDraftMutationDependencies = {
  persist: () => Promise<void>;
  commit: () => boolean | void;
};

/**
 * Persistence is the commit point: in-memory removal must never hide drafts
 * while an older queue can still rehydrate from device storage.
 */
export async function commitDraftMutationDurably(
  dependencies: DurableDraftMutationDependencies,
): Promise<boolean> {
  try {
    await dependencies.persist();
    return dependencies.commit() !== false;
  } catch {
    return false;
  }
}

export function clearDraftQueueDurably(dependencies: {
  clearPersisted: () => Promise<void>;
  commitCleared: () => void;
}): Promise<boolean> {
  return commitDraftMutationDurably({
    persist: dependencies.clearPersisted,
    commit: dependencies.commitCleared,
  });
}

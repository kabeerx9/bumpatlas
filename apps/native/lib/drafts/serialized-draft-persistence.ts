export type DraftPersistenceAdapter<T extends { id: string }> = {
  read: () => Promise<T[]>;
  write: (items: T[]) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * Serializes the whole read-modify-write operation, not only the final write.
 * That makes a completed clear a monotonic boundary: an older removal cannot
 * later persist the stale snapshot it read before the clear.
 */
export function createSerializedDraftPersistence<T extends { id: string }>(
  adapter: DraftPersistenceAdapter<T>,
) {
  let queue: Promise<void> = Promise.resolve();

  function run<R>(operation: () => Promise<R>): Promise<R> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    load: () => run(() => adapter.read()),
    save: (items: T[]) => {
      const snapshot = [...items];
      return run(() => adapter.write(snapshot));
    },
    upsert: (item: T) =>
      run(async () => {
        const current = await adapter.read();
        const next = [item, ...current.filter((entry) => entry.id !== item.id)];
        await adapter.write(next);
        return next;
      }),
    remove: (id: string) =>
      run(async () => {
        const current = await adapter.read();
        const next = current.filter((entry) => entry.id !== id);
        await adapter.write(next);
        return next;
      }),
    clear: () => run(() => adapter.clear()),
  };
}

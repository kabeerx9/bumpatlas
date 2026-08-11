import type { FamilySummary } from "@bumpatlas/contracts";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Query roots scoped by the server's implicit current family/child/stage. */
const FAMILY_CONTEXT_QUERY_ROOTS = new Set([
  "today",
  "memories",
  "family",
  "stage",
  "entitlements",
  "groups",
  "content",
  "recap",
  "ai",
  "notifications",
  "badges",
  "moderation",
  "milestones",
]);

export function isFamilyContextQueryKey(queryKey: QueryKey): boolean {
  const root = queryKey[0];
  return typeof root === "string" && FAMILY_CONTEXT_QUERY_ROOTS.has(root);
}

/** Remove stale tenant projections before exposing the newly accepted family. */
export function resetFamilyContextCache(
  queryClient: QueryClient,
  family: FamilySummary,
): void {
  queryClient.removeQueries({
    predicate: (query) => isFamilyContextQueryKey(query.queryKey),
  });
  queryClient.setQueryData(["family", "current"], family);
}

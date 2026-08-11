import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canSubmitInviteAcceptance,
  completeInviteOnboarding,
  INVITE_ONBOARDING_CONSENTS,
  shouldSuppressInviteGlobalError,
} from "../apps/native/features/family/lib/complete-invite-onboarding.ts";
import { legalDocuments } from "../apps/native/features/legal/data/legal-documents.ts";
import { isFamilyContextQueryKey } from "../apps/native/lib/api/family-context-cache.ts";
import {
  clearDraftQueueDurably,
  commitDraftMutationDurably,
} from "../apps/native/lib/drafts/clear-drafts.ts";
import { createSerializedDraftPersistence } from "../apps/native/lib/drafts/serialized-draft-persistence.ts";
import { parsePersistedDraftQueue } from "../apps/native/lib/drafts/parse-draft-queue.ts";
import {
  draftOwnerFileName,
  isDraftQueueReadyForOwner,
} from "../apps/native/lib/drafts/draft-owner.ts";
import { LEGAL_POLICY_EFFECTIVE_DATE } from "../apps/native/lib/legal-policy.ts";

const FAMILY = { id: "family-1", name: "The Riveras" } as never;

describe("invite acceptance readiness", () => {
  const ready = {
    signedIn: true,
    hasToken: true,
    previewReady: true,
    mutationPending: false,
    draftsHydrated: true,
    draftCount: 0,
    draftSyncPending: false,
    legalAccepted: true,
  };

  it("requires a verified preview and a fully hydrated empty draft queue", () => {
    assert.equal(canSubmitInviteAcceptance(ready), true);
    assert.equal(
      canSubmitInviteAcceptance({ ...ready, previewReady: false }),
      false,
    );
    assert.equal(
      canSubmitInviteAcceptance({ ...ready, draftsHydrated: false }),
      false,
    );
    assert.equal(canSubmitInviteAcceptance({ ...ready, draftCount: 1 }), false);
    assert.equal(
      canSubmitInviteAcceptance({ ...ready, draftSyncPending: true }),
      false,
    );
  });

  it("requires current legal confirmation for every signed-in recipient", () => {
    assert.equal(
      canSubmitInviteAcceptance({ ...ready, legalAccepted: false }),
      false,
    );
  });
});

describe("invite draft durability barrier", () => {
  it("namespaces draft storage and readiness by authenticated identity", () => {
    assert.equal(
      draftOwnerFileName("user/a"),
      "bumpatlas-memory-drafts-user%2Fa.json",
    );
    assert.notEqual(draftOwnerFileName("user-a"), draftOwnerFileName("user-b"));
    assert.equal(draftOwnerFileName("../user/a").includes("/"), false);
    assert.equal(isDraftQueueReadyForOwner("user-a", "user-a", true), true);
    assert.equal(isDraftQueueReadyForOwner("user-b", "user-a", true), false);
    assert.equal(isDraftQueueReadyForOwner(null, null, true), false);
  });

  it("does not reinterpret corrupt persisted data as an empty authoritative queue", () => {
    assert.deepEqual(parsePersistedDraftQueue<{ id: string }>(null), []);
    assert.throws(() => parsePersistedDraftQueue<{ id: string }>("not-json"));
    assert.throws(() => parsePersistedDraftQueue<{ id: string }>('{"id":"a"}'));
  });

  it("rejects persisted drafts that have no explicit household target", () => {
    type TargetedDraft = { id: string; familyId: string };
    const isTargetedDraft = (value: unknown): value is TargetedDraft => {
      if (!value || typeof value !== "object") return false;
      const draft = value as Record<string, unknown>;
      return (
        typeof draft.id === "string" &&
        typeof draft.familyId === "string" &&
        draft.familyId.trim().length > 0
      );
    };

    assert.deepEqual(
      parsePersistedDraftQueue<TargetedDraft>(
        '[{"id":"draft-1","familyId":"family-1"}]',
        isTargetedDraft,
      ),
      [{ id: "draft-1", familyId: "family-1" }],
    );
    assert.throws(() =>
      parsePersistedDraftQueue<TargetedDraft>(
        '[{"id":"draft-without-family"}]',
        isTargetedDraft,
      ),
    );
  });

  it("commits the empty in-memory queue only after persisted drafts are cleared", async () => {
    const events: string[] = [];

    const cleared = await clearDraftQueueDurably({
      clearPersisted: async () => {
        events.push("persisted");
      },
      commitCleared: () => {
        events.push("memory");
      },
    });

    assert.equal(cleared, true);
    assert.deepEqual(events, ["persisted", "memory"]);
  });

  it("keeps the in-memory queue when persisted deletion fails", async () => {
    let committed = false;

    const cleared = await clearDraftQueueDurably({
      clearPersisted: async () => {
        throw new Error("disk unavailable");
      },
      commitCleared: () => {
        committed = true;
      },
    });

    assert.equal(cleared, false);
    assert.equal(committed, false);
  });

  it("keeps an individual draft visible when its durable removal fails", async () => {
    let removedFromMemory = false;

    const removed = await commitDraftMutationDurably({
      persist: async () => {
        throw new Error("write failed");
      },
      commit: () => {
        removedFromMemory = true;
      },
    });

    assert.equal(removed, false);
    assert.equal(removedFromMemory, false);
  });

  it("acknowledges a new draft only after durable persistence and an owner-bound commit", async () => {
    const events: string[] = [];
    let releasePersist!: () => void;
    const persistGate = new Promise<void>((resolve) => {
      releasePersist = resolve;
    });

    const saving = commitDraftMutationDurably({
      persist: async () => {
        events.push("persist-start");
        await persistGate;
        events.push("persisted");
      },
      commit: () => {
        events.push("memory");
        return true;
      },
    });

    await Promise.resolve();
    assert.deepEqual(events, ["persist-start"]);
    releasePersist();
    assert.equal(await saving, true);
    assert.deepEqual(events, ["persist-start", "persisted", "memory"]);

    assert.equal(
      await commitDraftMutationDurably({
        persist: async () => undefined,
        commit: () => false,
      }),
      false,
    );
  });

  it("serializes a stale draft removal ahead of a later clear", async () => {
    type Item = { id: string };
    let stored: Item[] = [{ id: "a" }, { id: "b" }];
    let releaseWrite!: () => void;
    let signalWriteStarted!: () => void;
    const writeStarted = new Promise<void>((resolve) => {
      signalWriteStarted = resolve;
    });
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let firstWrite = true;

    const persistence = createSerializedDraftPersistence<Item>({
      read: async () => stored,
      write: async (items) => {
        if (firstWrite) {
          firstWrite = false;
          signalWriteStarted();
          await writeGate;
        }
        stored = items;
      },
      clear: async () => {
        stored = [];
      },
    });

    const remove = persistence.remove("a");
    await writeStarted;
    const clear = persistence.clear();
    releaseWrite();
    await Promise.all([remove, clear]);

    assert.deepEqual(stored, []);
  });
});

describe("invite legal and auth-error policy", () => {
  it("ties recorded policy versions to the displayed legal revision", () => {
    assert.equal(legalDocuments.terms.updated, LEGAL_POLICY_EFFECTIVE_DATE);
    assert.equal(legalDocuments.privacy.updated, LEGAL_POLICY_EFFECTIVE_DATE);
    assert.ok(
      INVITE_ONBOARDING_CONSENTS.every((consent) => consent.version === "2026-07-01"),
    );
  });

  it("suppresses only the invite-specific email mismatch from global auth handling", () => {
    assert.equal(
      shouldSuppressInviteGlobalError(
        { status: 403, code: "INVITE_EMAIL_MISMATCH" },
      ),
      true,
    );
    assert.equal(
      shouldSuppressInviteGlobalError(
        { status: 403, code: "FORBIDDEN" },
      ),
      false,
    );
    assert.equal(
      shouldSuppressInviteGlobalError({ status: 401 }),
      false,
    );
  });
});

describe("invite-first onboarding coordinator", () => {
  it("syncs identity, records legal evidence, accepts, adopts, then completes locally", async () => {
    const events: string[] = [];

    const family = await completeInviteOnboarding(
      { token: "invite-token" },
      {
        syncAccount: async () => void events.push("sync-account"),
        createConsent: async (consent) => void events.push(`consent:${consent.type}:${consent.version}`),
        acceptInvite: async ({ token }) => {
          events.push(`accept:${token}`);
          return FAMILY;
        },
        adoptFamily: async () => void events.push("adopt-family"),
        completeOnboarding: async () => void events.push("complete-local"),
      },
    );

    assert.equal(family, FAMILY);
    assert.deepEqual(events, [
      "sync-account",
      ...INVITE_ONBOARDING_CONSENTS.map(
        (consent) => `consent:${consent.type}:${consent.version}`,
      ),
      "accept:invite-token",
      "adopt-family",
      "complete-local",
    ]);
  });

  it("records idempotent current-policy evidence for an already-ready member", async () => {
    const events: string[] = [];

    await completeInviteOnboarding(
      { token: "invite-token" },
      {
        syncAccount: async () => void events.push("sync-account"),
        createConsent: async (consent) => void events.push(`consent:${consent.type}`),
        acceptInvite: async () => {
          events.push("accept");
          return FAMILY;
        },
        adoptFamily: async () => void events.push("adopt-family"),
        completeOnboarding: async () => void events.push("complete-local"),
      },
    );

    assert.deepEqual(events, [
      "sync-account",
      ...INVITE_ONBOARDING_CONSENTS.map((consent) => `consent:${consent.type}`),
      "accept",
      "adopt-family",
      "complete-local",
    ]);
  });

  it("never accepts or completes after a failed consent write", async () => {
    const events: string[] = [];

    await assert.rejects(() =>
      completeInviteOnboarding(
        { token: "invite-token" },
        {
          syncAccount: async () => void events.push("sync-account"),
          createConsent: async (consent) => {
            events.push(`consent:${consent.type}`);
            if (consent.type === "terms") throw new Error("consent failed");
          },
          acceptInvite: async () => {
            events.push("accept");
            return FAMILY;
          },
          adoptFamily: async () => void events.push("adopt-family"),
          completeOnboarding: async () => void events.push("complete-local"),
        },
      ),
    );

    assert.deepEqual(events, ["sync-account", "consent:age_attestation", "consent:terms"]);
  });

  it("never adopts or completes after acceptance fails", async () => {
    const events: string[] = [];

    await assert.rejects(() =>
      completeInviteOnboarding(
        { token: "invite-token" },
        {
          syncAccount: async () => void events.push("sync-account"),
          createConsent: async () => void 0,
          acceptInvite: async () => {
            events.push("accept");
            throw new Error("expired");
          },
          adoptFamily: async () => void events.push("adopt-family"),
          completeOnboarding: async () => void events.push("complete-local"),
        },
      ),
    );

    assert.deepEqual(events, ["sync-account", "accept"]);
  });
});

describe("household context cache boundary", () => {
  it("identifies every implicit-current-household query namespace", () => {
    for (const root of [
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
    ]) {
      assert.equal(isFamilyContextQueryKey([root]), true, root);
    }

    assert.equal(isFamilyContextQueryKey(["invites", "preview"]), false);
    assert.equal(isFamilyContextQueryKey(["account"]), false);
  });
});

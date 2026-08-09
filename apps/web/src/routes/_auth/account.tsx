import { useClerk, useUser } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Input } from "@bumpatlas/ui/components/input";
import { Label } from "@bumpatlas/ui/components/label";

import { PageShell } from "@/components/page-shell";
import { ApiError, deleteAccount, updateAccount } from "@/lib/api";

export const Route = createFileRoute("/_auth/account")({
  head: () => ({ meta: [{ title: "Account · BumpAtlas" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateAccount({ firstName, lastName });
      await user?.reload();
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount({ confirmation: "DELETE" });
      await signOut();
      navigate({ to: "/" });
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = deleteConfirmation === "DELETE";

  return (
    <PageShell className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your profile or delete your account.
        </p>
      </div>

      <div className="card-soft flex flex-col gap-6 border border-border bg-card p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Display name</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                placeholder="First name"
                className="h-10 rounded-[9px] border-border"
              />
              <Input
                aria-label="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                placeholder="Last name"
                className="h-10 rounded-[9px] border-border"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-[9px] bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
            {saveSuccess ? <p className="text-sm text-[oklch(45%_0.1_150)]">Profile updated.</p> : null}
          </div>
        </form>

        <div className="border-t border-border pt-6">
          <Label className="text-sm font-medium text-foreground">Email</Label>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-sm text-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Managed by Clerk
            </span>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 rounded-[14px] border px-7 py-[26px]"
        style={{ background: "#F6E9DD", borderColor: "#E0C3A9" }}
      >
        <div>
          <p className="text-[15px] font-semibold" style={{ color: "#7A3C1E" }}>
            Danger zone
          </p>
          <p className="mt-1 text-[13.5px]" style={{ color: "#8A5A3B" }}>
            Deleting your account removes your profile and access permanently. This can&apos;t be
            undone.
          </p>
        </div>

        <div
          className="flex flex-col gap-3 rounded-[11px] border bg-white p-4 sm:flex-row sm:items-end sm:justify-between"
          style={{ borderColor: "#E0C3A9" }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="deleteConfirmation" className="text-xs font-medium text-foreground">
              Type DELETE to confirm
            </Label>
            <Input
              id="deleteConfirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
              className="h-9 rounded-[9px] border-border"
            />
          </div>
          <button
            type="button"
            disabled={!canDelete || deleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-[9px] px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed"
            style={{ background: "#B5502E", opacity: canDelete ? 1 : 0.5 }}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
        {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      </div>
    </PageShell>
  );
}

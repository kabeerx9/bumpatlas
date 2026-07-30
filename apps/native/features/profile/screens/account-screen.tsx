import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, borderWidth, colors, radius, spacing, useAppTheme } from "@/design-system";
import {
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from "@/features/profile/mutations";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { ApiError } from "@/lib/api";
import { appRoutes } from "@/navigation/routes";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const theme = useAppTheme();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user]);

  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateAccountMutation.mutateAsync({ firstName, lastName });
      await user?.reload();
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Failed to update account"));
    }
  }

  async function performDelete() {
    setDeleteError(null);
    try {
      await deleteAccountMutation.mutateAsync({ confirmation: "DELETE" });
      await signOut();
      router.replace(appRoutes.auth.signIn);
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, "Failed to delete account"));
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace(appRoutes.auth.signIn);
    } finally {
      setSigningOut(false);
    }
  }

  function handleDeletePress() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your identity and household data on our servers.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void performDelete() },
      ],
    );
  }

  const canDelete = deleteConfirmation === "DELETE";
  const saving = updateAccountMutation.isPending;
  const deleting = deleteAccountMutation.isPending;

  const initials = `${firstName?.[0] ?? user?.firstName?.[0] ?? ""}${lastName?.[0] ?? user?.lastName?.[0] ?? ""}`.toUpperCase();
  const fullName = [firstName || user?.firstName, lastName || user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <SoftStackShell title="Account" onBack={() => router.back()}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.pastel.lemon }]}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
          ) : (
            <AppText variant="title" weight="semibold">
              {initials || "?"}
            </AppText>
          )}
        </View>
        <AppText variant="title" weight="semibold" align="center">
          {fullName || "Your account"}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          Update your profile or permanently delete your account and data.
        </AppText>
      </View>

      <View style={[styles.card, { borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconChip, { backgroundColor: colors.pastel.sky }]}>
            <Feather name="user" size={16} color={colors.brand.ink} />
          </View>
          <AppText weight="semibold">Profile</AppText>
        </View>
        <AppText variant="label" tone="secondary">
          First name
        </AppText>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <AppText variant="label" tone="secondary">
          Last name
        </AppText>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        {saveError ? (
          <AppText variant="bodySmall" style={{ color: theme.colors.danger }}>
            {saveError}
          </AppText>
        ) : null}
        {saveSuccess ? (
          <AppText variant="bodySmall" style={{ color: theme.colors.brandText }}>
            Profile updated.
          </AppText>
        ) : null}
        <Button disabled={saving} onPress={() => void handleSave()}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </View>

      <Button
        variant="ghost"
        disabled={signingOut}
        onPress={() => void handleSignOut()}
        style={styles.signOutBtn}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </Button>

      <View style={[styles.card, { borderColor: theme.colors.dangerBorder }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconChip, { backgroundColor: theme.colors.dangerSurface }]}>
            <Feather name="alert-triangle" size={16} color={theme.colors.danger} />
          </View>
          <AppText weight="semibold" style={{ color: theme.colors.danger }}>
            Delete account
          </AppText>
        </View>
        <AppText variant="bodySmall" tone="secondary">
          Removes your account, authored posts, AI history, and household membership. Export
          first if you want a copy.
        </AppText>
        <AppText variant="label" tone="secondary">
          Type DELETE to confirm
        </AppText>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          placeholder="DELETE"
          autoCapitalize="characters"
        />
        {deleteError ? (
          <AppText variant="bodySmall" style={{ color: theme.colors.danger }}>
            {deleteError}
          </AppText>
        ) : null}
        <Button
          variant="destructive"
          disabled={!canDelete || deleting}
          onPress={handleDeletePress}
        >
          {deleting ? "Deleting..." : "Delete account"}
        </Button>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: borderWidth.hairline,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.lg,
    fontFamily: "Poppins_400Regular",
  },
  signOutBtn: {
    alignSelf: "center",
    borderColor: "transparent",
  },
});

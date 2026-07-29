import { Feather } from "@expo/vector-icons";
import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Atmosphere, Button, colors, radius, spacing } from "@/design-system";
import {
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from "@/features/profile/mutations";
import { ApiError } from "@/lib/api";
import { appRoutes } from "@/navigation/routes";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Account</AppText>
          <View style={styles.iconBtn} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <AppText variant="body" tone="secondary">
              Update your profile or permanently delete your account and data.
            </AppText>

            <View style={styles.card}>
              <AppText weight="semibold">Profile</AppText>
              <AppText variant="label" tone="secondary">
                First name
              </AppText>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <AppText variant="label" tone="secondary">
                Last name
              </AppText>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              {saveError ? (
                <AppText variant="bodySmall" style={styles.error}>
                  {saveError}
                </AppText>
              ) : null}
              {saveSuccess ? (
                <AppText variant="bodySmall" style={styles.success}>
                  Profile updated.
                </AppText>
              ) : null}
              <Button disabled={saving} onPress={() => void handleSave()}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </View>

            <View style={[styles.card, styles.dangerCard]}>
              <AppText weight="semibold" style={styles.dangerTitle}>
                Delete account
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                Removes your account, authored posts, AI history, and household membership. Export
                first if you want a copy.
              </AppText>
              <AppText variant="label" tone="secondary">
                Type DELETE to confirm
              </AppText>
              <TextInput
                style={styles.input}
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                placeholder="DELETE"
                autoCapitalize="characters"
              />
              {deleteError ? (
                <AppText variant="bodySmall" style={styles.error}>
                  {deleteError}
                </AppText>
              ) : null}
              <Button
                disabled={!canDelete || deleting}
                onPress={handleDeletePress}
                style={styles.dangerBtn}
              >
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  dangerCard: { borderColor: colors.brand.terracotta },
  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing.lg,
    fontFamily: "Poppins_400Regular",
    color: colors.text.primary,
  },
  error: { color: colors.brand.terracotta },
  success: { color: colors.brand.peach },
  dangerTitle: { color: colors.brand.terracotta },
  dangerBtn: { backgroundColor: colors.brand.terracotta },
});

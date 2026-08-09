import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import { formatLongDate } from "@/features/shared/lib/format-date";

type DateFieldProps = {
  label: string;
  /** ISO date (YYYY-MM-DD), or empty/null when unset. */
  value: string | null | undefined;
  /** Always fires with an ISO date (YYYY-MM-DD) — never free text. */
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Native date picker, no typed entry. iOS opens a bottom-sheet spinner (fits
 * the Soft Atlas modal aesthetic); Android opens the platform's own dialog —
 * imperative there, so there's no picker UI for us to theme.
 */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Select a date",
  accessibilityLabel,
  style,
}: DateFieldProps) {
  const theme = useAppTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => parseIsoDate(value));

  const displayValue = value ? formatLongDate(value) : placeholder;

  function openPicker() {
    const initial = parseIsoDate(value);
    setDraftDate(initial);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: (event, selected) => {
          if (event.type === "set" && selected) {
            onChange(toIsoDate(selected));
          }
        },
      });
      return;
    }

    setSheetOpen(true);
  }

  return (
    <>
      <View style={[styles.field, style]}>
        <AppText variant="label" tone="secondary">
          {label}
        </AppText>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppText tone={value ? "primary" : "muted"}>{displayValue}</AppText>
          <Feather name="calendar" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {Platform.OS === "ios" ? (
        <Modal
          visible={sheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSheetOpen(false)}
        >
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropDismiss} onPress={() => setSheetOpen(false)} />
            <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceElevated }]}>
              <AppText variant="subhead" weight="semibold" style={styles.sheetTitle}>
                {label}
              </AppText>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_event, selected) => {
                  if (selected) setDraftDate(selected);
                }}
                style={styles.picker}
              />
              <View style={styles.sheetActions}>
                <Button
                  variant="ghost"
                  size="lg"
                  style={styles.sheetButton}
                  onPress={() => setSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="lg"
                  style={styles.sheetButton}
                  onPress={() => {
                    onChange(toIsoDate(draftDate));
                    setSheetOpen(false);
                  }}
                >
                  Done
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function parseIsoDate(value: string | null | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(43,35,31,0.32)",
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: {
    textAlign: "center",
  },
  picker: {
    alignSelf: "center",
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sheetButton: {
    flex: 1,
  },
});

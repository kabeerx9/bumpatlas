import { StyleSheet, TextInput, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";

type NameStepProps = {
  name: string;
  onChangeName: (value: string) => void;
};

export function NameStep({ name, onChangeName }: NameStepProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.block}>
      <AppText variant="heading">Tell us about your little one</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        A name helps personalize memories, Today, and your family space.
      </AppText>

      <View style={styles.field}>
        <AppText variant="label" tone="secondary">
          Baby’s Name
        </AppText>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="What should we call them?"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text },
          ]}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lead: { maxWidth: 320, lineHeight: 24 },
  field: { gap: spacing.sm, marginTop: spacing.lg },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});

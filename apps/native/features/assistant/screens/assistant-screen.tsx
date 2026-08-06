import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import {
  AppText,
  ChatBubble,
  IconButton,
  borderWidth,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { CitationCard, type Citation } from "@/features/shared/components/citation-card";
import { EscalateCard } from "@/features/shared/components/escalate-card";
import { QuotaMeter } from "@/features/shared/components/quota-meter";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useAiUsageQuery, useSendAiChatMutation } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const SUGGESTIONS = [
  "Suggest a memory prompt for today",
  "Summarize this week's moments",
  "Find a short wellness idea",
  "My baby has a fever of 102",
];

const INTRO_MESSAGE: ThreadItem = {
  role: "assistant",
  id: "intro",
  text: "I can help with prompts, recaps, and reviewed tips. I can't diagnose, dose medicine, or say a baby is healthy or delayed.",
};

type ThreadItem =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      citation?: Citation;
      escalate?: boolean;
      id: string;
    };

export function AssistantScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const dynamicStyles = themedStyles(theme);
  const { weekSummaryConsent, setWeekSummaryConsent } = useMockUi();
  const aiUsageQuery = useAiUsageQuery();
  const sendAi = useSendAiChatMutation();
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>([INTRO_MESSAGE]);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const aiMessagesUsed = aiUsageQuery.data?.dailyUsed ?? 0;
  const aiDailyLimit = aiUsageQuery.data?.dailyLimit ?? 10;
  const aiHourlyUsed = aiUsageQuery.data?.hourlyUsed ?? 0;
  const aiHourlyLimit = aiUsageQuery.data?.hourlyLimit ?? 20;

  const dailyExhausted = aiMessagesUsed >= aiDailyLimit;
  const hourlyExhausted = aiHourlyUsed >= aiHourlyLimit;
  const exhausted = dailyExhausted || hourlyExhausted;
  const limitReason = hourlyExhausted
    ? "Hourly limit reached (20/hr)"
    : dailyExhausted
      ? "Daily limit reached"
      : null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || exhausted || sending) return;

    if (/summarize/i.test(trimmed) && !weekSummaryConsent) {
      setPendingSummary(trimmed);
      return;
    }

    setMessage("");
    setPendingSummary(null);
    setThread((current) => [...current, { role: "user", text: trimmed }]);

    setSending(true);
    try {
      const response = await sendAi.mutateAsync({ message: trimmed });
      const citation = response.message.citations?.[0];
      setThread((current) => [
        ...current,
        {
          role: "assistant",
          id: response.message.id,
          text: response.message.body,
          citation: citation
            ? {
                title: citation.title,
                sourceName: citation.source,
                reviewerName: "BumpAtlas",
                reviewedOn: new Date().toISOString().slice(0, 10),
                guideId: citation.id,
              }
            : undefined,
          escalate: Boolean(response.message.escalate),
        },
      ]);
    } catch {
      setThread((current) => [
        ...current,
        {
          role: "assistant",
          id: `err-${Date.now()}`,
          text: "I couldn’t reach the assistant just now. Try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function confirmSummaryWithConsent() {
    if (!pendingSummary) return;
    setWeekSummaryConsent(true);
    void send(pendingSummary);
  }

  function clearConversation() {
    Alert.alert("Clear conversation?", "This removes the current thread.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setThread([INTRO_MESSAGE]);
          setReportedIds([]);
          setPendingSummary(null);
        },
      },
    ]);
  }

  function reportAnswer(id: string) {
    setReportedIds((current) => [...current, id]);
    Alert.alert("Answer reported", "Thanks — we'll review flagged AI responses during beta.");
  }

  return (
    <SoftStackShell
      title="Ask BumpAtlas"
      closeIcon="x"
      onBack={() => router.back()}
      scroll={false}
      right={
        <IconButton accessibilityLabel="Clear conversation" onPress={clearConversation} tone="card">
          <Feather name="trash-2" size={18} color={theme.colors.text} />
        </IconButton>
      }
    >
      <AppText variant="caption" tone="secondary" align="center">
        Educational · not medical advice
      </AppText>

      <View style={styles.quotaWrap}>
        <QuotaMeter
          used={aiMessagesUsed}
          limit={aiDailyLimit}
          label="AI messages today"
          onUpgrade={dailyExhausted ? () => router.push(appRoutes.paywall("ai-quota")) : undefined}
        />
        <QuotaMeter
          used={aiHourlyUsed}
          limit={aiHourlyLimit}
          label="AI messages this hour"
          exhaustedLabel="Hourly limit reached · View premium"
          onUpgrade={
            hourlyExhausted && !dailyExhausted
              ? () => router.push(appRoutes.paywall("ai-quota"))
              : undefined
          }
        />
        {limitReason ? (
          <AppText variant="caption" tone="secondary">
            {limitReason}. Free plan soft-caps keep answers calm for everyone.
          </AppText>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
        >
          {thread.map((item, index) => (
            <View
              key={item.role === "assistant" ? item.id : `user-${index}`}
              style={item.role === "user" ? styles.rowMine : styles.rowTheirs}
            >
              <ChatBubble from={item.role === "user" ? "you" : "them"}>{item.text}</ChatBubble>
              {item.role === "assistant" && item.citation ? (
                <CitationCard
                  citation={item.citation}
                  onOpen={() =>
                    item.citation?.guideId &&
                    router.push(appRoutes.guideArticle(item.citation.guideId))
                  }
                />
              ) : null}
              {item.role === "assistant" && item.escalate ? (
                <EscalateCard
                  onEmergency={() =>
                    Alert.alert(
                      "Emergency",
                      "If you or your baby are in immediate danger, call your local emergency number.",
                    )
                  }
                />
              ) : null}
              {item.role === "assistant" && item.id !== "intro" ? (
                <Pressable
                  onPress={() => reportAnswer(item.id)}
                  style={styles.reportRow}
                  disabled={reportedIds.includes(item.id)}
                >
                  <Feather name="flag" size={12} color={theme.colors.textMuted} />
                  <AppText variant="caption" tone="secondary">
                    {reportedIds.includes(item.id) ? "Reported" : "Report answer"}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ))}

          {pendingSummary ? (
            <SoftPanel style={styles.consentPanel}>
              <AppText weight="semibold">Week summary consent</AppText>
              <Pressable
                style={styles.consentRow}
                onPress={() => setWeekSummaryConsent(!weekSummaryConsent)}
              >
                <View
                  style={[
                    dynamicStyles.checkbox,
                    weekSummaryConsent && dynamicStyles.checkboxOn,
                  ]}
                >
                  {weekSummaryConsent ? (
                    <Feather name="check" size={12} color={theme.colors.primaryText} />
                  ) : null}
                </View>
                <AppText variant="bodySmall" style={styles.consentCopy}>
                  I consent to summarizing my selected week of text memories
                </AppText>
              </Pressable>
              <Pressable
                style={[dynamicStyles.consentBtn, !weekSummaryConsent && styles.consentBtnDisabled]}
                onPress={confirmSummaryWithConsent}
                disabled={!weekSummaryConsent}
              >
                <AppText variant="caption" weight="semibold" tone="primary" style={{ color: theme.colors.primaryText }}>
                  Continue with summary
                </AppText>
              </Pressable>
            </SoftPanel>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
          >
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => void send(suggestion)}
                disabled={exhausted}
                style={({ pressed }) => [
                  dynamicStyles.suggestion,
                  pressed && dynamicStyles.suggestionPressed,
                ]}
              >
                {({ pressed }) => (
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={pressed ? { color: theme.colors.secondaryText } : { color: theme.colors.text }}
                  >
                    {suggestion}
                  </AppText>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>

        <View style={dynamicStyles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={limitReason ?? "Ask something calm..."}
            placeholderTextColor={theme.colors.textMuted}
            style={dynamicStyles.input}
            editable={!exhausted}
            accessibilityLabel="Ask BumpAtlas"
            allowFontScaling
            maxFontSizeMultiplier={1.35}
          />
          <Pressable
            onPress={() => void send(message)}
            disabled={exhausted || sending || message.trim().length === 0}
            style={[
              dynamicStyles.sendBtn,
              (message.trim().length === 0 || exhausted || sending) && styles.sendDisabled,
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Feather name="arrow-up" size={20} color={theme.colors.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quotaWrap: { paddingBottom: spacing.sm, gap: spacing.sm },
  thread: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  rowMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    maxWidth: "92%",
    gap: spacing.xs,
  },
  rowTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    maxWidth: "92%",
    gap: spacing.xs,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
    marginLeft: spacing.sm,
    paddingVertical: 4,
  },
  consentPanel: { gap: spacing.sm, marginTop: spacing.sm },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  consentCopy: { flex: 1, lineHeight: 20 },
  consentBtnDisabled: { opacity: 0.4 },
  suggestions: { gap: spacing.sm, marginTop: spacing.md, paddingRight: spacing.page },
  sendDisabled: { opacity: 0.4 },
});

/** Theme-dependent styles: bubbles, chips, and the composer need light/dark aware tokens. */
function themedStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: borderWidth.emphasis,
      borderColor: theme.colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    checkboxOn: { backgroundColor: theme.colors.secondary },
    consentBtn: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.secondary,
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    suggestion: {
      ...shadows.soft,
      borderRadius: radius.full,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 1,
      alignSelf: "flex-start",
    },
    suggestionPressed: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    composer: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
      alignItems: "center",
    },
    input: {
      ...shadows.soft,
      flex: 1,
      minHeight: 48,
      borderRadius: radius.full,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.lg,
      color: theme.colors.text,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

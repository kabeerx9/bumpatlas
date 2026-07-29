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

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockAssistantResponses } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { CitationCard, type Citation } from "@/features/shared/components/citation-card";
import { EscalateCard } from "@/features/shared/components/escalate-card";
import { QuotaMeter } from "@/features/shared/components/quota-meter";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
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
  const {
    aiMessagesUsed,
    incrementAiUsage,
    aiDailyLimit,
    resetAiUsage,
    aiHourlyUsed,
    aiHourlyLimit,
    weekSummaryConsent,
    setWeekSummaryConsent,
  } = useMockUi();
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>([INTRO_MESSAGE]);
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);

  const dailyExhausted = aiMessagesUsed >= aiDailyLimit;
  const hourlyExhausted = aiHourlyUsed >= aiHourlyLimit;
  const exhausted = dailyExhausted || hourlyExhausted;
  const limitReason = hourlyExhausted
    ? "Hourly limit reached (20/hr)"
    : dailyExhausted
      ? "Daily limit reached"
      : null;

  function buildReply(trimmed: string): ThreadItem {
    const isDosing = /dose|tylenol|ibuprofen/i.test(trimmed);
    const isEscalate = /fever|emergency|breathing|911|urgent/i.test(trimmed);
    const isSummary = /summarize/i.test(trimmed);
    const isWellness = /wellness|stretch|care|tired/i.test(trimmed);

    if (isDosing) {
      return {
        role: "assistant",
        id: `a-${Date.now()}`,
        text: mockAssistantResponses.dosing.text,
        escalate: true,
      };
    }

    if (isEscalate) {
      return {
        role: "assistant",
        id: `a-${Date.now()}`,
        text: mockAssistantResponses.escalate.text,
        escalate: true,
      };
    }

    if (isSummary) {
      return {
        role: "assistant",
        id: `a-${Date.now()}`,
        text: mockAssistantResponses.summary.text,
        citation: mockAssistantResponses.summary.citation,
      };
    }

    return {
      role: "assistant",
      id: `a-${Date.now()}`,
      text: isWellness
        ? mockAssistantResponses.wellness.text
        : "Here's a calm, stage-aware thought based on reviewed BumpAtlas content.",
      citation: isWellness ? mockAssistantResponses.wellness.citation : undefined,
    };
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || exhausted) return;

    if (/summarize/i.test(trimmed) && !weekSummaryConsent) {
      setPendingSummary(trimmed);
      return;
    }

    incrementAiUsage();
    const assistantReply = buildReply(trimmed);
    setThread((current) => [...current, { role: "user", text: trimmed }, assistantReply]);
    setMessage("");
    setPendingSummary(null);
  }

  function confirmSummaryWithConsent() {
    if (!pendingSummary) return;
    setWeekSummaryConsent(true);
    send(pendingSummary);
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
          Alert.alert("Reset AI usage too?", "Restore your daily message count to zero.", [
            { text: "Keep usage", style: "cancel" },
            { text: "Reset usage", onPress: () => resetAiUsage() },
          ]);
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
        <Pressable
          onPress={clearConversation}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel="Clear conversation"
        >
          <Feather name="trash-2" size={18} color={colors.brand.ink} />
        </Pressable>
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
        <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          {thread.map((item, index) => (
            <View key={item.role === "assistant" ? item.id : `user-${index}`}>
              <View
                style={[
                  styles.bubble,
                  item.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <AppText
                  variant="bodySmall"
                  tone={item.role === "user" ? "inverse" : "primary"}
                >
                  {item.text}
                </AppText>
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
              </View>
              {item.role === "assistant" && item.id !== "intro" ? (
                <Pressable
                  onPress={() => reportAnswer(item.id)}
                  style={styles.reportRow}
                  disabled={reportedIds.includes(item.id)}
                >
                  <Feather name="flag" size={12} color={colors.text.muted} />
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
                <View style={[styles.checkbox, weekSummaryConsent && styles.checkboxOn]}>
                  {weekSummaryConsent ? (
                    <Feather name="check" size={12} color={colors.text.inverse} />
                  ) : null}
                </View>
                <AppText variant="bodySmall" style={styles.consentCopy}>
                  I consent to summarizing my selected week of text memories
                </AppText>
              </Pressable>
              <Pressable
                style={[styles.consentBtn, !weekSummaryConsent && styles.consentBtnDisabled]}
                onPress={confirmSummaryWithConsent}
                disabled={!weekSummaryConsent}
              >
                <AppText variant="caption" weight="semibold" tone="inverse">
                  Continue with summary
                </AppText>
              </Pressable>
            </SoftPanel>
          ) : null}

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestion}
                onPress={() => send(suggestion)}
                disabled={exhausted}
              >
                <AppText variant="caption" weight="semibold" style={styles.suggestionText}>
                  {suggestion}
                </AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={limitReason ?? "Ask something calm..."}
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            editable={!exhausted}
            accessibilityLabel="Ask BumpAtlas"
            allowFontScaling
            maxFontSizeMultiplier={1.35}
          />
          <Pressable
            onPress={() => send(message)}
            disabled={message.trim().length === 0 || exhausted}
            style={[styles.sendBtn, (message.trim().length === 0 || exhausted) && styles.sendDisabled]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Feather name="arrow-up" size={20} color={colors.text.inverse} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
  quotaWrap: { paddingBottom: spacing.sm, gap: spacing.sm },
  thread: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.brand.peach },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.78)" },
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.brand.peach },
  consentCopy: { flex: 1, lineHeight: 20 },
  consentBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  consentBtnDisabled: { opacity: 0.4 },
  suggestions: { gap: spacing.sm, marginTop: spacing.md },
  suggestion: {
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  suggestionText: { color: colors.brand.peach },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});

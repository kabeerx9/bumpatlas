import {
  BottomSheet as UniversalBottomSheet,
  Button as ExpoButton,
  Checkbox,
  FieldGroup,
  Host,
  List,
  ListItem,
  Picker as ExpoPicker,
  Slider as ExpoSlider,
  Switch as ExpoSwitch,
  Text as ExpoText,
  TextInput as ExpoTextInput,
  useNativeState,
} from "@expo/ui";
import BottomSheet, {
  BottomSheetView,
  type BottomSheetMethods,
} from "@expo/ui/community/bottom-sheet";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { MenuView, type NativeActionEvent } from "@expo/ui/community/menu";
import { Picker as CommunityPicker } from "@expo/ui/community/picker";
import SegmentedControl from "@expo/ui/community/segmented-control";
import CommunitySlider from "@expo/ui/community/slider";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, Surface, colors, radius, spacing } from "@/design-system";

type TravelMode = "walk" | "transit" | "bike";
type Density = "comfortable" | "compact" | "dense";

const travelModeLabel: Record<TravelMode, string> = {
  walk: "Walking",
  transit: "Transit",
  bike: "Bike",
};

export function ExpoUiShowcaseScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(true);
  const [routeRadius, setRouteRadius] = useState(40);
  const [nativeRadius, setNativeRadius] = useState(55);
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [density, setDensity] = useState<Density>("comfortable");
  const [segmentIndex, setSegmentIndex] = useState(1);
  const title = useNativeState("Evening food walk");
  const [visitDate, setVisitDate] = useState(new Date());
  const [universalSheetVisible, setUniversalSheetVisible] = useState(false);
  const [lastMenuAction, setLastMenuAction] = useState("None yet");

  function handleMenuAction(event: NativeActionEvent) {
    const action = event.nativeEvent.event;
    setLastMenuAction(action);
    if (action === "share") {
      Alert.alert("Expo UI menu", "Share action selected.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backButton}>
            <AppText variant="bodySmall" weight="semibold" tone="brand">
              Back
            </AppText>
          </Pressable>
          <View style={styles.titleGroup}>
            <AppText variant="caption" tone="tertiary" weight="semibold">
              SDK 56
            </AppText>
            <AppText variant="heading">Expo UI</AppText>
            <AppText variant="body" tone="secondary">
              Native SwiftUI and Jetpack Compose components inside the BumpAtlas app.
            </AppText>
          </View>
        </View>

        <ShowcaseSection
          eyebrow="Universal"
          title="Native controls"
          description="These come from @expo/ui and render through Expo's universal primitives."
        >
          <Host colorScheme="light" style={styles.nativeIsland}>
            <FieldGroup style={{ height: 330 }}>
              <FieldGroup.Section title="Trip Preferences">
                <ListItem
                  supportingText="System switch mapped to SwiftUI Toggle / Compose Switch"
                  trailing={
                    <ExpoSwitch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                    />
                  }
                >
                  Notifications
                </ListItem>
                <ListItem
                  supportingText="Native checkbox with platform-appropriate interaction"
                  trailing={
                    <Checkbox
                      label=""
                      value={privacyChecked}
                      onValueChange={setPrivacyChecked}
                    />
                  }
                >
                  Privacy mode
                </ListItem>
                <ListItem
                  supportingText={`${travelModeLabel[travelMode]} routes`}
                  trailing={
                    <ExpoPicker selectedValue={travelMode} onValueChange={setTravelMode}>
                      <ExpoPicker.Item label="Walking" value="walk" />
                      <ExpoPicker.Item label="Transit" value="transit" />
                      <ExpoPicker.Item label="Bike" value="bike" />
                    </ExpoPicker>
                  }
                >
                  Travel mode
                </ListItem>
              </FieldGroup.Section>

              <FieldGroup.Section title="Draft">
                <ExpoTextInput
                  value={title}
                  placeholder="Collection title"
                  autoCapitalize="words"
                  style={styles.nativeTextInput}
                  textStyle={styles.nativeTextInputText}
                />
                <ExpoSlider
                  value={routeRadius}
                  onValueChange={setRouteRadius}
                  min={5}
                  max={100}
                  step={5}
                />
                <ExpoButton
                  label={`Preview radius: ${Math.round(routeRadius)} km`}
                  variant="outlined"
                  onPress={() => setUniversalSheetVisible(true)}
                />
              </FieldGroup.Section>
            </FieldGroup>
          </Host>
        </ShowcaseSection>

        <ShowcaseSection
          eyebrow="Universal"
          title="Lists and layout"
          description="This is the universal list API rendered as a native list surface."
        >
          <Host colorScheme="light" style={styles.listHost}>
            <List>
              <ListItem leading="1" supportingText="Save a themed walk for a neighborhood">
                Create route
              </ListItem>
              <ListItem leading="2" supportingText="Use native rows for compact settings flows">
                Review places
              </ListItem>
              <ListItem leading="3" trailing="Ready" supportingText="Commit the route to the city guide">
                Publish
              </ListItem>
            </List>
          </Host>
        </ShowcaseSection>

        <ShowcaseSection
          eyebrow="Drop-in"
          title="Community replacements"
          description="These imports mirror common community packages but route through @expo/ui."
        >
          <View style={styles.dropInStack}>
            <ControlBlock label="SegmentedControl">
              <SegmentedControl
                values={["Map", "List", "Saved"]}
                selectedIndex={segmentIndex}
                onChange={(event) => setSegmentIndex(event.nativeEvent.selectedSegmentIndex)}
                style={styles.segmentedControl}
              />
            </ControlBlock>

            <ControlBlock label={`Slider: ${Math.round(nativeRadius)} km`}>
              <CommunitySlider
                value={nativeRadius}
                minimumValue={0}
                maximumValue={100}
                step={5}
                minimumTrackTintColor={colors.discovery.teal}
                onValueChange={setNativeRadius}
                style={styles.communitySlider}
              />
            </ControlBlock>

            <ControlBlock label="Picker">
              <CommunityPicker
                selectedValue={density}
                onValueChange={(value) => setDensity(value as Density)}
                style={styles.communityPicker}
              >
                <CommunityPicker.Item label="Comfortable" value="comfortable" />
                <CommunityPicker.Item label="Compact" value="compact" />
                <CommunityPicker.Item label="Dense" value="dense" />
              </CommunityPicker>
            </ControlBlock>

            <ControlBlock label="DateTimePicker">
              <DateTimePicker
                value={visitDate}
                mode="date"
                display={Platform.OS === "ios" ? "compact" : "default"}
                onValueChange={(_, date) => setVisitDate(date)}
                accentColor={colors.brand.purple500}
                style={styles.datePicker}
              />
            </ControlBlock>

            <ControlBlock label={`MenuView: ${lastMenuAction}`}>
              <MenuView
                title="Collection actions"
                onPressAction={handleMenuAction}
                actions={[
                  { id: "duplicate", title: "Duplicate", image: "doc.on.doc" },
                  { id: "share", title: "Share", image: "square.and.arrow.up" },
                  {
                    id: "delete",
                    title: "Delete",
                    image: "trash",
                    attributes: { destructive: true },
                  },
                ]}
              >
                <Pressable style={styles.menuTrigger}>
                  <AppText variant="bodySmall" weight="semibold" tone="brand">
                    Open native menu
                  </AppText>
                </Pressable>
              </MenuView>
            </ControlBlock>

            <Button variant="secondary" onPress={() => bottomSheetRef.current?.snapToIndex(0)}>
              Open drop-in bottom sheet
            </Button>
          </View>
        </ShowcaseSection>
      </ScrollView>

      <UniversalBottomSheet
        isPresented={universalSheetVisible}
        onDismiss={() => setUniversalSheetVisible(false)}
        snapPoints={["half", "full"]}
      >
        <Host matchContents={{ vertical: true }} style={styles.universalSheetHost}>
          <ExpoText textStyle={styles.sheetTitle}>Universal BottomSheet</ExpoText>
          <ExpoText textStyle={styles.sheetBody}>
            This sheet comes from the universal @expo/ui export.
          </ExpoText>
          <ExpoButton label="Close" onPress={() => setUniversalSheetVisible(false)} />
        </Host>
      </UniversalBottomSheet>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["35%", "70%"]}
        enablePanDownToClose
        onClose={() => bottomSheetRef.current?.close()}
      >
        <BottomSheetView style={styles.sheetContent}>
          <AppText variant="title">Drop-in BottomSheet</AppText>
          <AppText variant="body" tone="secondary">
            This uses @expo/ui/community/bottom-sheet as a replacement for @gorhom/bottom-sheet.
          </AppText>
          <Button variant="primary" onPress={() => bottomSheetRef.current?.close()}>
            Done
          </Button>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function ShowcaseSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Surface tone="card" elevated padding="lg" radiusSize="lg" style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="caption" tone="brand" weight="semibold">
          {eyebrow}
        </AppText>
        <AppText variant="title">{title}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {description}
        </AppText>
      </View>
      {children}
    </Surface>
  );
}

function ControlBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.controlBlock}>
      <AppText variant="caption" tone="tertiary" weight="semibold">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  container: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },
  titleGroup: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.lg,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  nativeIsland: {
    height: 330,
    overflow: "hidden",
    borderRadius: radius.lg,
  },
  nativeTextInput: {
    width: "100%",
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
  },
  nativeTextInputText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  listHost: {
    minHeight: 176,
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.surface.cool,
  },
  dropInStack: {
    gap: spacing.lg,
  },
  controlBlock: {
    gap: spacing.sm,
  },
  segmentedControl: {
    width: "100%",
  },
  communitySlider: {
    width: "100%",
    height: 42,
  },
  communityPicker: {
    width: "100%",
    minHeight: 44,
  },
  datePicker: {
    alignSelf: "flex-start",
  },
  menuTrigger: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border.lavender,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand.lavenderLight,
  },
  universalSheetHost: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  sheetBody: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetContent: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
});

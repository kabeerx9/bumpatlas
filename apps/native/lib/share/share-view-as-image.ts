import type { RefObject } from "react";
import { Platform, Share } from "react-native";

/**
 * Capture a view as a PNG and open the native share sheet.
 * Falls back to text share when capture/sharing native modules are unavailable.
 */
export async function shareViewAsImage(options: {
  viewRef: RefObject<unknown>;
  textFallback: string;
  filename?: string;
}): Promise<"image" | "text"> {
  if (Platform.OS === "web") {
    await Share.share({ message: options.textFallback });
    return "text";
  }

  try {
    let Sharing: typeof import("expo-sharing") | null = null;
    let captureRef: typeof import("react-native-view-shot").captureRef | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Sharing = require("expo-sharing") as typeof import("expo-sharing");
    } catch {
      Sharing = null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const viewShot = require("react-native-view-shot") as typeof import("react-native-view-shot");
      captureRef = viewShot.captureRef;
    } catch {
      captureRef = null;
    }

    if (!captureRef) {
      await Share.share({ message: options.textFallback });
      return "text";
    }

    const uri = await captureRef(options.viewRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    if (!Sharing) {
      await Share.share({ message: options.textFallback, url: uri });
      return "image";
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      await Share.share({ message: options.textFallback, url: uri });
      return "image";
    }

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Share recap card",
      UTI: "public.png",
    });
    return "image";
  } catch {
    await Share.share({ message: options.textFallback });
    return "text";
  }
}

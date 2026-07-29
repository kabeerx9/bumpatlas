import { Platform } from "react-native";

export type PreparedPhoto = {
  uri: string;
  width: number;
  height: number;
  contentType: "image/jpeg";
  /** Approximate byte size after compress; used for upload-url request. */
  byteSize: number;
};

export type PickPhotoResult =
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "failed"; message: string }
  | { status: "selected"; photo: PreparedPhoto };

type ImagePickerMod = typeof import("expo-image-picker");
type ImageManipulatorMod = typeof import("expo-image-manipulator");

function loadImagePicker(): ImagePickerMod | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker") as ImagePickerMod;
  } catch {
    return null;
  }
}

function loadImageManipulator(): ImageManipulatorMod | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-manipulator") as ImageManipulatorMod;
  } catch {
    return null;
  }
}

async function ensureLibraryPermission(ImagePicker: ImagePickerMod): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

async function ensureCameraPermission(ImagePicker: ImagePickerMod): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return requested.granted;
}

/**
 * Pick from library or camera, compress, and strip EXIF/GPS via re-encode.
 * Safe when native ImageManipulator/ImagePicker are missing (returns failed).
 */
export async function pickAndPreparePhoto(
  source: "library" | "camera" = "library",
): Promise<PickPhotoResult> {
  const ImagePicker = loadImagePicker();
  const ImageManipulator = loadImageManipulator();
  if (!ImagePicker || !ImageManipulator) {
    return {
      status: "failed",
      message:
        "Photo tools need a rebuilt native app. Run: pnpm --filter native android",
    };
  }

  try {
    const allowed =
      source === "camera" ? await ensureCameraPermission(ImagePicker) : await ensureLibraryPermission(ImagePicker);
    if (!allowed) return { status: "denied" };

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
            exif: false,
            allowsMultipleSelection: false,
          });

    if (result.canceled || !result.assets[0]) return { status: "cancelled" };

    const asset = result.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.min(asset.width || 1600, 1600) } }],
      {
        compress: 0.72,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    const stripped = await ImageManipulator.manipulateAsync(manipulated.uri, [], {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const byteSize = Math.max(
      32_000,
      Math.round((stripped.width * stripped.height * 0.35) / (Platform.OS === "ios" ? 1 : 1.1)),
    );

    return {
      status: "selected",
      photo: {
        uri: stripped.uri,
        width: stripped.width,
        height: stripped.height,
        contentType: "image/jpeg",
        byteSize,
      },
    };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Could not prepare photo",
    };
  }
}

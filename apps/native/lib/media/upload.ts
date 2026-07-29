import * as FileSystem from "expo-file-system/legacy";

/**
 * Upload a local file URI to a signed URL.
 * Prefer FileSystem upload for React Native file:// URIs; fall back to fetch/blob.
 */
export async function uploadMediaToSignedUrl(
  uploadUrl: string,
  localUri: string,
  contentType: string,
  headers?: Record<string, string>,
) {
  try {
    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": contentType,
        ...headers,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Media upload failed (${result.status})`);
    }
    return;
  } catch (primaryError) {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          ...headers,
        },
        body: blob,
      });
      if (!put.ok) {
        throw new Error(`Media upload failed (${put.status})`);
      }
    } catch {
      throw primaryError instanceof Error
        ? primaryError
        : new Error("Media upload failed");
    }
  }
}

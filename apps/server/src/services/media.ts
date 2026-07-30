import prisma from "@bumpatlas/db";
import type { MediaUploadUrlResponse } from "@bumpatlas/contracts/v1";
import type { MediaAsset } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";
import { randomUUID } from "node:crypto";

import { getEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";

/** Signed upload URLs are short-lived: long enough for a slow phone upload, no longer. */
const UPLOAD_URL_TTL_SECONDS = 15 * 60;
/** Signed download URLs are shorter still — they are handed to a rendering client. */
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
]);

/**
 * Object storage is injected so services and tests never reach a live bucket.
 *
 * Signing is the only operation that must be real in production; everything the
 * quota and attachment logic does is database work, which is what the tests care
 * about.
 */
export type StorageSigner = {
  createUploadUrl: (input: {
    storageKey: string;
    contentType: string;
    byteSize: number;
    expiresInSeconds: number;
  }) => Promise<{ url: string; headers?: Record<string, string> }>;
  createDownloadUrl: (input: {
    storageKey: string;
    expiresInSeconds: number;
  }) => Promise<string>;
  deleteObject: (storageKey: string) => Promise<void>;
};

/**
 * Fails loudly when storage is unconfigured rather than returning a URL that will
 * 404 after the user has already waited through an upload.
 */
export const unconfiguredSigner: StorageSigner = {
  createUploadUrl: async () => {
    throw new ServiceError(503, "MEDIA_UNAVAILABLE", "Photo uploads are not available yet.");
  },
  createDownloadUrl: async () => {
    throw new ServiceError(503, "MEDIA_UNAVAILABLE", "Photo downloads are not available yet.");
  },
  deleteObject: async () => {},
};

let cachedSigner: StorageSigner | null = null;

/**
 * Builds the S3-compatible signer lazily.
 *
 * Lazy because `@aws-sdk/*` is only installed for the media phase and the server must
 * still boot without storage configured — importing at module load would make every
 * route depend on a bucket.
 */
export async function getStorageSigner(): Promise<StorageSigner> {
  if (cachedSigner) return cachedSigner;

  if (
    !env.OBJECT_STORAGE_ENDPOINT ||
    !env.OBJECT_STORAGE_BUCKET ||
    !env.OBJECT_STORAGE_ACCESS_KEY_ID ||
    !env.OBJECT_STORAGE_SECRET_ACCESS_KEY
  ) {
    return unconfiguredSigner;
  }

  const [{ S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand }, { getSignedUrl }] =
    await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner")]);

  const client = new S3Client({
    region: env.OBJECT_STORAGE_REGION,
    endpoint: env.OBJECT_STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    },
    // R2 and most S3-compatible providers require path-style addressing.
    forcePathStyle: true,
  });

  const bucket = env.OBJECT_STORAGE_BUCKET;

  cachedSigner = {
    createUploadUrl: async ({ storageKey, contentType, byteSize, expiresInSeconds }) => {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          ContentType: contentType,
          // Signed into the URL so a client cannot upload something larger than the
          // size its quota was checked against.
          ContentLength: byteSize,
        }),
        { expiresIn: expiresInSeconds },
      );

      return { url, headers: { "Content-Type": contentType } };
    },
    createDownloadUrl: ({ storageKey, expiresInSeconds }) =>
      getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), {
        expiresIn: expiresInSeconds,
      }),
    deleteObject: async (storageKey) => {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    },
  };

  return cachedSigner;
}

/**
 * Counts this family's uploads in the current calendar month.
 *
 * Counts, not bytes: `mediaUploadsUsed`/`mediaUploadsLimit` are what the shipped UI
 * displays, so that is what gets enforced.
 */
export async function countMonthlyUploads(familyId: string, now = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return prisma.mediaAsset.count({
    where: {
      familyId,
      createdAt: { gte: monthStart },
      // A pending row still counts: otherwise issuing URLs without uploading would
      // be a free way around the quota.
      status: { in: ["PENDING", "ATTACHED"] },
    },
  });
}

export function buildStorageKey(familyId: string, contentType: string): string {
  const extension = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") ?? "bin";
  // Family-prefixed and random: keys are never guessable from a memory or child ID.
  return `families/${familyId}/${randomUUID()}.${extension}`;
}

/**
 * Issues a signed upload URL and records the pending asset.
 *
 * The pending row is created *before* the client uploads so a memory can only ever
 * attach an object this family was granted — a client cannot invent a storage key.
 * Orphaned pending rows are purged by cron.
 */
export async function createUploadUrl(input: {
  familyId: string;
  userId: string;
  contentType: string;
  byteSize: number;
  signer: StorageSigner;
}): Promise<MediaUploadUrlResponse> {
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new ServiceError(400, "UNSUPPORTED_MEDIA_TYPE", "That file type is not supported.");
  }

  const entitlement = await getEntitlements(input.familyId);
  const used = await countMonthlyUploads(input.familyId);

  if (used >= entitlement.mediaUploadsPerMonth) {
    throw new ServiceError(429, "QUOTA_EXCEEDED", "You have used this month's photo uploads.", {
      limitKey: "media_uploads_monthly",
      used,
      limit: entitlement.mediaUploadsPerMonth,
      resetsAt: nextMonthStart().toISOString(),
      upgradeAvailable: !entitlement.isPremium,
    });
  }

  const storageKey = buildStorageKey(input.familyId, input.contentType);

  // Provider call happens outside any transaction (§5.10): a slow signer inside one
  // would hold a connection and can exhaust the pool.
  const signed = await input.signer.createUploadUrl({
    storageKey,
    contentType: input.contentType,
    byteSize: input.byteSize,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  });

  await prisma.mediaAsset.create({
    data: {
      familyId: input.familyId,
      uploaderUserId: input.userId,
      storageKey,
      contentType: input.contentType,
      byteSize: input.byteSize,
      status: "PENDING",
    },
  });

  return {
    uploadUrl: signed.url,
    storageKey,
    expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    ...(signed.headers ? { headers: signed.headers } : {}),
  };
}

function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Resolves a storage key the caller is allowed to attach.
 *
 * Requires same family *and* same uploader, and requires the asset to still be
 * pending. Without the uploader check, one household member could attach another's
 * in-flight upload; without the family check, any key at all.
 */
export async function claimPendingAsset(input: {
  familyId: string;
  userId: string;
  storageKey: string;
}): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      storageKey: input.storageKey,
      familyId: input.familyId,
      uploaderUserId: input.userId,
      status: "PENDING",
    },
  });

  if (!asset) {
    throw new ServiceError(404, "MEDIA_NOT_FOUND", "That upload could not be found.");
  }

  return asset;
}

/** Signed, short-lived, and generated per read — never stored on the memory row. */
export async function createDownloadUrl(
  storageKey: string,
  signer: StorageSigner,
): Promise<string | null> {
  try {
    return await signer.createDownloadUrl({
      storageKey,
      expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
    });
  } catch {
    // A memory must still be readable when storage is unavailable: the text is the
    // point, the photo is an enhancement.
    return null;
  }
}

import prisma from "@bumpatlas/db";
import type { User } from "@bumpatlas/db/types";
import type { MeResponse } from "@bumpatlas/contracts/me";
import type { UserJSON } from "@clerk/fastify";

export type UserProfileInput = {
  clerkId: string;
  email?: string | null;
  name?: string | null;
  imageUrl?: string | null;
};

type ClerkEmailAddressLike = {
  id: string;
  emailAddress: string;
  verification: { status: string } | null;
};

type ClerkApiUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: ClerkEmailAddressLike[];
  primaryEmailAddressId: string | null;
};

/** Current Clerk-verified addresses, normalized for authorization comparisons. */
export function listVerifiedClerkEmails(user: Pick<ClerkApiUserLike, "emailAddresses">): string[] {
  return user.emailAddresses
    .filter((entry) => entry.verification?.status === "verified")
    .map((entry) => entry.emailAddress.trim().toLowerCase());
}

export function mapClerkApiUser(user: ClerkApiUserLike): UserProfileInput {
  const verifiedAddresses = user.emailAddresses.filter(
    (entry) => entry.verification?.status === "verified",
  );
  const primaryEmail =
    verifiedAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
    verifiedAddresses[0]?.emailAddress;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  return {
    clerkId: user.id,
    email: primaryEmail ?? null,
    name,
    imageUrl: user.imageUrl ?? null,
  };
}

export function mapClerkUser(user: UserJSON): UserProfileInput {
  const verifiedAddresses = user.email_addresses.filter(
    (entry) => entry.verification?.status === "verified",
  );
  const primaryEmail =
    verifiedAddresses.find((entry) => entry.id === user.primary_email_address_id)?.email_address ??
    verifiedAddresses[0]?.email_address;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

  return {
    clerkId: user.id,
    email: primaryEmail ?? null,
    name,
    imageUrl: user.image_url ?? null,
  };
}

export async function upsertUserFromClerk(profile: UserProfileInput): Promise<User> {
  return prisma.user.upsert({
    where: { clerkId: profile.clerkId },
    create: {
      clerkId: profile.clerkId,
      email: profile.email,
      name: profile.name,
      imageUrl: profile.imageUrl,
    },
    update: {
      email: profile.email,
      name: profile.name,
      imageUrl: profile.imageUrl,
    },
  });
}

export async function getOrCreateUserByClerkId(
  clerkId: string,
  syncFromClerk: () => Promise<UserProfileInput>,
): Promise<User> {
  const profile = await syncFromClerk();
  if (profile.clerkId !== clerkId) {
    throw new Error("Clerk identity response did not match the authenticated user.");
  }

  // `/api/me` is an explicit identity synchronization endpoint, so refresh even
  // an existing mirror. A non-null cached email is not proof that Clerk still
  // considers that address verified or attached to this account.
  return upsertUserFromClerk(profile);
}

export async function deleteUserByClerkId(clerkId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { clerkId } });
}

export async function updateAccountFromClerk(
  clerkId: string,
  input: { firstName?: string | null; lastName?: string | null },
  updateClerkUser: (
    userId: string,
    updateInput: { firstName?: string | null; lastName?: string | null },
  ) => Promise<Parameters<typeof mapClerkApiUser>[0]>,
  isAdmin: boolean,
): Promise<MeResponse> {
  const clerkUser = await updateClerkUser(clerkId, input);
  const user = await upsertUserFromClerk(mapClerkApiUser(clerkUser));
  return serializeUser(user, isAdmin);
}

export function serializeUser(user: User, isAdmin: boolean): MeResponse {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    isAdmin,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

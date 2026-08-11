import type {
  CreateInviteInput,
  CreateInviteResponse,
} from "@bumpatlas/contracts";

export type InviteDelivery =
  | { kind: "link" }
  | { kind: "email"; email: string };

export type PreparedInvite = {
  invite: CreateInviteResponse;
  delivery: InviteDelivery;
};

export function createInviteDeliveryCoordinator(
  createInvite: (input: CreateInviteInput) => Promise<CreateInviteResponse>,
): {
  prepare: (delivery: InviteDelivery) => Promise<PreparedInvite>;
} {
  let prepared: PreparedInvite | null = null;
  let inFlight: Promise<PreparedInvite> | null = null;

  return {
    prepare(delivery) {
      if (prepared) return Promise.resolve(prepared);
      if (inFlight) return inFlight;

      const input: CreateInviteInput =
        delivery.kind === "email"
          ? { role: "CONTRIBUTOR", email: delivery.email.trim() }
          : { role: "CONTRIBUTOR" };

      inFlight = createInvite(input)
        .then((invite) => {
          prepared = { invite, delivery };
          return prepared;
        })
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    },
  };
}

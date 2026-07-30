import { env } from "@bumpatlas/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaPg(
    { connectionString: env.DATABASE_URL },
    // Unset in development and production, where queries target `public`.
    // Integration tests point this at a dedicated schema so truncating between
    // tests cannot reach real data.
    env.DATABASE_SCHEMA ? { schema: env.DATABASE_SCHEMA } : undefined,
  );
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;

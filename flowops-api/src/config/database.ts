import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "./env";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
  });

  return new PrismaClient({
    adapter,
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

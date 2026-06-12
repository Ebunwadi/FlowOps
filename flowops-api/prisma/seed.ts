import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { DEFAULT_PERMISSIONS } from "../src/modules/permissions/default-permissions";
import { PrismaClient } from "../src/generated/prisma/client";

function createSeedClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the database seed.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export async function seedDefaultPermissions(
  prisma: Pick<PrismaClient, "permission">,
): Promise<number> {
  for (const permission of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: {
        key: permission.key,
        description: permission.description,
      },
      update: {
        description: permission.description,
      },
    });
  }

  return DEFAULT_PERMISSIONS.length;
}

async function main(): Promise<void> {
  const prisma = createSeedClient();

  try {
    const count = await seedDefaultPermissions(prisma);
    console.log(`Seeded ${count} default permissions.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

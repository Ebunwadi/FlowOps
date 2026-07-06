-- CreateTable
CREATE TABLE "organisation_settings" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "allowAiFeatures" BOOLEAN NOT NULL DEFAULT true,
    "allowWebhooks" BOOLEAN NOT NULL DEFAULT true,
    "allowApiKeys" BOOLEAN NOT NULL DEFAULT true,
    "defaultSlaHours" INTEGER,
    "requireCommentsOnReject" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_settings_organisationId_key" ON "organisation_settings"("organisationId");

-- AddForeignKey
ALTER TABLE "organisation_settings" ADD CONSTRAINT "organisation_settings_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill default settings for existing organisations
INSERT INTO "organisation_settings" (
    "id",
    "organisationId",
    "allowAiFeatures",
    "allowWebhooks",
    "allowApiKeys",
    "requireCommentsOnReject",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    o."id",
    true,
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organisations" o
WHERE NOT EXISTS (
    SELECT 1
    FROM "organisation_settings" os
    WHERE os."organisationId" = o."id"
);

-- CreateTable
CREATE TABLE "out_of_office_rules" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delegateToId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "out_of_office_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "out_of_office_rules_organisationId_idx" ON "out_of_office_rules"("organisationId");

-- CreateIndex
CREATE INDEX "out_of_office_rules_userId_idx" ON "out_of_office_rules"("userId");

-- CreateIndex
CREATE INDEX "out_of_office_rules_delegateToId_idx" ON "out_of_office_rules"("delegateToId");

-- AddForeignKey
ALTER TABLE "out_of_office_rules" ADD CONSTRAINT "out_of_office_rules_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_office_rules" ADD CONSTRAINT "out_of_office_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_office_rules" ADD CONSTRAINT "out_of_office_rules_delegateToId_fkey" FOREIGN KEY ("delegateToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "keycloakUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakUserId_key" ON "users"("keycloakUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

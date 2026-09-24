-- CreateTable
CREATE TABLE "discord_notification_templates" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" VARCHAR(200),
    "description" VARCHAR(2000),
    "buttonLabel" VARCHAR(100),
    "buttonUrl" VARCHAR(500),
    "channelId" VARCHAR(50),
    "roleId" VARCHAR(50),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "discord_notification_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "discord_notification_templates" ADD CONSTRAINT "discord_notification_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

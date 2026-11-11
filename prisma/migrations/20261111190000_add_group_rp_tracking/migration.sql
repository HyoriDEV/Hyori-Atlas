-- AlterTable
ALTER TABLE "chapters" ALTER COLUMN "playerId" DROP NOT NULL;
ALTER TABLE "chapters" ADD COLUMN "rpTrackingGroupId" TEXT;

-- CreateTable
CREATE TABLE "rp_tracking_groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "rp_tracking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rp_tracking_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterSheetId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rp_tracking_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rp_tracking_groups_conversationId_key" ON "rp_tracking_groups"("conversationId");

-- CreateIndex
CREATE INDEX "rp_tracking_group_members_userId_idx" ON "rp_tracking_group_members"("userId");

-- CreateIndex
CREATE INDEX "rp_tracking_group_members_characterSheetId_idx" ON "rp_tracking_group_members"("characterSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "rp_tracking_group_members_groupId_userId_key" ON "rp_tracking_group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "chapters_rpTrackingGroupId_idx" ON "chapters"("rpTrackingGroupId");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_rpTrackingGroupId_fkey" FOREIGN KEY ("rpTrackingGroupId") REFERENCES "rp_tracking_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_tracking_groups" ADD CONSTRAINT "rp_tracking_groups_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_tracking_groups" ADD CONSTRAINT "rp_tracking_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_tracking_group_members" ADD CONSTRAINT "rp_tracking_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "rp_tracking_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_tracking_group_members" ADD CONSTRAINT "rp_tracking_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rp_tracking_group_members" ADD CONSTRAINT "rp_tracking_group_members_characterSheetId_fkey" FOREIGN KEY ("characterSheetId") REFERENCES "character_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;


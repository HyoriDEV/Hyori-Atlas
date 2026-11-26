-- CreateTable
CREATE TABLE "rp_tracking_group_chapters" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rp_tracking_group_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rp_tracking_group_chapters_groupId_idx" ON "rp_tracking_group_chapters"("groupId");

-- AddForeignKey
ALTER TABLE "rp_tracking_group_chapters" ADD CONSTRAINT "rp_tracking_group_chapters_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "rp_tracking_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

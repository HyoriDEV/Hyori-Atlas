/*
  Warnings:

  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `waitlistedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `ticket_messages` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[conversationId]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversationId` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('TICKET', 'RP_TRACKING');

-- CreateEnum
CREATE TYPE "MessageAuthorType" AS ENUM ('PLAYER', 'STAFF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Homme', 'Femme', 'Autre');

-- CreateEnum
CREATE TYPE "CharacterSheetStatus" AS ENUM ('DRAFT', 'PENDING_PLAYER', 'PENDING_STAFF', 'VALIDATED');

-- CreateEnum
CREATE TYPE "CharacterSheetCommentTarget" AS ENUM ('name', 'nickname', 'age', 'gender', 'civilStatus', 'heightCm', 'description', 'background', 'additionalComments', 'skillMap');

-- CreateEnum
CREATE TYPE "InterviewBookingStatus" AS ENUM ('REGISTERED', 'CHANGES_REQUESTED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "BdaReportStatus" AS ENUM ('UNREAD', 'RESOLVED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_ticketId_fkey";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "conversationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email",
DROP COLUMN "emailVerified",
DROP COLUMN "image",
DROP COLUMN "name",
DROP COLUMN "waitlistedAt";

-- DropTable
DROP TABLE "ticket_messages";

-- DropEnum
DROP TYPE "TicketMessageAuthorType";

-- CreateTable
CREATE TABLE "registration_status_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT,
    "status" "RegistrationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheets" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "nickname" VARCHAR(50),
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "civilStatus" VARCHAR(50) NOT NULL,
    "heightMeters" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "background" VARCHAR(2000) NOT NULL,
    "additionalComments" VARCHAR(300),
    "physicalForce" INTEGER NOT NULL DEFAULT 1,
    "physicalEndurance" INTEGER NOT NULL DEFAULT 1,
    "physicalStealth" INTEGER NOT NULL DEFAULT 1,
    "physicalDexterity" INTEGER NOT NULL DEFAULT 1,
    "mentalIntelligence" INTEGER NOT NULL DEFAULT 1,
    "mentalComposure" INTEGER NOT NULL DEFAULT 1,
    "mentalWeaponsMastery" INTEGER NOT NULL DEFAULT 1,
    "socialCharisma" INTEGER NOT NULL DEFAULT 1,
    "socialPersuasion" INTEGER NOT NULL DEFAULT 1,
    "socialViolence" INTEGER NOT NULL DEFAULT 1,
    "reviewStatus" "CharacterSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "hasUnreadFeedback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheet_comments" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "authorId" TEXT,
    "target" "CharacterSheetCommentTarget" NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "quotedText" VARCHAR(500),
    "anchorStart" INTEGER,
    "anchorPrefix" VARCHAR(64),
    "anchorSuffix" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_sheet_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheet_review_history" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "authorId" TEXT,
    "status" "CharacterSheetStatus" NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_sheet_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_slots" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_bookings" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "InterviewBookingStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_notes" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorType" "MessageAuthorType" NOT NULL,
    "authorId" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkHref" TEXT,
    "linkLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_message_versions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bda_reports" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BdaReportStatus" NOT NULL DEFAULT 'UNREAD',
    "ticketId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bda_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bda_staff_members" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "bda_staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bda_parties" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "bda_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bda_party_members" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "bda_party_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bda_attachments" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bda_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "interviewBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ticketCreationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rpTrackingAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chapterWritingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bdaReportSubmissionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "character_sheets_playerId_key" ON "character_sheets"("playerId");

-- CreateIndex
CREATE INDEX "character_sheet_comments_sheetId_idx" ON "character_sheet_comments"("sheetId");

-- CreateIndex
CREATE INDEX "character_sheet_review_history_sheetId_idx" ON "character_sheet_review_history"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_bookings_slotId_key" ON "interview_bookings"("slotId");

-- CreateIndex
CREATE INDEX "interview_bookings_playerId_idx" ON "interview_bookings"("playerId");

-- CreateIndex
CREATE INDEX "staff_notes_playerId_idx" ON "staff_notes"("playerId");

-- CreateIndex
CREATE INDEX "chapters_playerId_idx" ON "chapters"("playerId");

-- CreateIndex
CREATE INDEX "conversation_members_userId_idx" ON "conversation_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversationId_userId_key" ON "conversation_members"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_message_versions_messageId_idx" ON "conversation_message_versions"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "bda_reports_ticketId_key" ON "bda_reports"("ticketId");

-- CreateIndex
CREATE INDEX "bda_staff_members_userId_idx" ON "bda_staff_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bda_staff_members_reportId_userId_key" ON "bda_staff_members"("reportId", "userId");

-- CreateIndex
CREATE INDEX "bda_party_members_userId_idx" ON "bda_party_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bda_party_members_partyId_userId_key" ON "bda_party_members"("partyId", "userId");

-- CreateIndex
CREATE INDEX "bda_attachments_reportId_idx" ON "bda_attachments"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_conversationId_key" ON "tickets"("conversationId");

-- AddForeignKey
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_comments" ADD CONSTRAINT "character_sheet_comments_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_comments" ADD CONSTRAINT "character_sheet_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_review_history" ADD CONSTRAINT "character_sheet_review_history_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_review_history" ADD CONSTRAINT "character_sheet_review_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_bookings" ADD CONSTRAINT "interview_bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "interview_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_bookings" ADD CONSTRAINT "interview_bookings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_bookings" ADD CONSTRAINT "interview_bookings_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_message_versions" ADD CONSTRAINT "conversation_message_versions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_reports" ADD CONSTRAINT "bda_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_reports" ADD CONSTRAINT "bda_reports_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_staff_members" ADD CONSTRAINT "bda_staff_members_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "bda_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_staff_members" ADD CONSTRAINT "bda_staff_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_parties" ADD CONSTRAINT "bda_parties_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "bda_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_party_members" ADD CONSTRAINT "bda_party_members_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "bda_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_party_members" ADD CONSTRAINT "bda_party_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bda_attachments" ADD CONSTRAINT "bda_attachments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "bda_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role, BdaReportStatus } from "@/lib/generated/prisma/enums";
import { getGlobalSettings } from "@/lib/services/settings-service";

const bdaRoles = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export interface CreateBdaReportData {
  title: string;
  description: string;
  ticketId?: string;
  staffMemberIds?: string[];
  parties: {
    name: string;
    playerIds: string[];
  }[];
  attachments: string[];
}

export async function createBdaReport(data: CreateBdaReportData) {
  const user = await requireRole(bdaRoles);
  const settings = await getGlobalSettings();

  if (!settings.bdaReportSubmissionEnabled) {
    throw new Error(
      "La soumission de rapports a été temporairement désactivée par un administrateur."
    );
  }

  const trimmedTitle = data.title.trim();
  const trimmedDescription = data.description.trim();

  if (!trimmedTitle || !trimmedDescription) {
    throw new Error("L'intitulé et la description sont requis.");
  }

  if (data.parties.length < 1) {
    throw new Error("Au moins une partie doit être définie.");
  }

  for (const party of data.parties) {
    if (!party.name.trim()) {
      throw new Error("Toutes les parties doivent avoir un nom.");
    }
    if (!party.playerIds || party.playerIds.length === 0) {
      throw new Error(`La partie "${party.name.trim()}" doit contenir au moins un joueur.`);
    }
  }

  const staffMemberIds = (data.staffMemberIds || []).filter((id) => id !== user.id);

  const report = await prisma.bdaReport.create({
    data: {
      title: trimmedTitle,
      description: trimmedDescription,
      ticketId: data.ticketId || null,
      createdById: user.id,
      staffMembers:
        staffMemberIds.length > 0
          ? {
              create: staffMemberIds.map((userId) => ({ userId })),
            }
          : undefined,
      parties: {
        create: data.parties.map((party) => ({
          name: party.name.trim(),
          members: {
            create: party.playerIds.map((id) => ({ userId: id })),
          },
        })),
      },
      attachments: {
        create: data.attachments.map((url) => ({ url })),
      },
    },
  });

  revalidatePath("/staff/bda-reports");
  return { id: report.id };
}

export async function updateBdaReportStatus(id: string, status: BdaReportStatus) {
  await requireRole(bdaRoles);

  const report = await prisma.bdaReport.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!report) {
    throw new Error("Rapport introuvable.");
  }

  if (report.status === BdaReportStatus.ARCHIVED && status === BdaReportStatus.UNREAD) {
    throw new Error("Impossible de marquer un rapport archivé comme non lu.");
  }

  await prisma.bdaReport.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/staff/bda-reports");
  revalidatePath(`/staff/bda-reports/${id}`);
}

export async function deleteBdaReport(id: string) {
  await requireRole(bdaRoles);

  await prisma.bdaReport.delete({
    where: { id },
  });

  revalidatePath("/staff/bda-reports");
  return { success: true };
}

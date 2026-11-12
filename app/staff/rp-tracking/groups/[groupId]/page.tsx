import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, SanctionType, CharacterStatus } from "@/lib/generated/prisma/enums";
import { rpTrackingStaffRoles } from "@/lib/navigation";
import { markConversationAsRead } from "@/lib/actions/conversation-actions";
import { getRpTrackingGroupDetail } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { GroupWorkspace } from "@/components/staff/rp-tracking/group-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const group = await prisma.rpTrackingGroup.findUnique({
    where: { id: groupId },
    select: { name: true },
  });

  return {
    title: group?.name ? `Suivi RP Groupe : ${group.name}` : "Suivi RP Groupe",
  };
}

export default async function StaffGroupRpTrackingDetailPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  const staffUser = await requireRole(rpTrackingStaffRoles);

  const [group, rawUsers] = await Promise.all([
    getRpTrackingGroupDetail(groupId, staffUser.id, true),
    prisma.user.findMany({
      where: {
        registrationStatus: RegistrationStatus.WHITELISTED,
        sanctions: {
          none: {
            type: SanctionType.EXCLUSION,
            revokedAt: null,
          },
        },
      },
      select: {
        id: true,
        minecraftUsername: true,
        discordDisplayName: true,
        discordUsername: true,
        discordAvatarUrl: true,
        role: true,
        registrationStatus: true,
        characterSheets: {
          where: { status: CharacterStatus.ACTIVE },
          take: 1,
          select: { name: true, status: true },
        },
      },
      orderBy: { discordDisplayName: "asc" },
    }),
  ]);

  if (!group) {
    notFound();
  }

  // Marquer automatiquement la conversation comme lue par le staff dès consultation
  await markConversationAsRead(group.conversationId, true);

  const availablePlayers: PlayerOption[] = rawUsers.map((u) => ({
    id: u.id,
    minecraftUsername: u.minecraftUsername,
    discordDisplayName: u.discordDisplayName,
    discordUsername: u.discordUsername,
    discordAvatarUrl: u.discordAvatarUrl,
    role: u.role,
    registrationStatus: u.registrationStatus,
    characterName: u.characterSheets[0]?.name ?? null,
    characterSheets: u.characterSheets,
  }));

  return (
    <GroupWorkspace group={group} availablePlayers={availablePlayers} viewerId={staffUser.id} />
  );
}

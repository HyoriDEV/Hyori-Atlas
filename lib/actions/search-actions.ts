"use server";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { allStaffRoles } from "@/lib/navigation";
import { ticketAccessWhere } from "@/lib/ticket-access";
import { CharacterStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";

export interface GlobalSearchPlayerResult {
  id: string;
  label: string;
  minecraftUsername: string | null;
  minecraftUuid: string | null;
  minecraftAvatarUrl: string | null;
  minecraftSkinUpdatedAt: string | null;
}

export interface GlobalSearchTicketResult {
  id: string;
  label: string;
  createdAt: string;
}

export interface GlobalSearchRpTrackingGroupResult {
  id: string;
  name: string;
  label: string;
  sublabel: string | null;
  membersCount: number;
}

export interface GlobalSearchResults {
  players: GlobalSearchPlayerResult[];
  tickets: GlobalSearchTicketResult[];
  rpTrackingGroups: GlobalSearchRpTrackingGroupResult[];
}

export async function globalSearchAction(query: string): Promise<GlobalSearchResults> {
  const staffUser = await requireRole(allStaffRoles);

  const term = query.trim();
  if (term.length < 3) {
    return { players: [], tickets: [], rpTrackingGroups: [] };
  }

  const [rawPlayers, rawTickets, rawGroups] = await Promise.all([
    // Atlas des joueurs : Recherche sur le pseudo et UUID Minecraft,
    // sur le nom d'affichage, pseudo et ID Discord, et le nom RP, le tout à la fois.
    prisma.user.findMany({
      where: {
        registrationStatus: { not: RegistrationStatus.REJECTED },
        OR: [
          { minecraftUsername: { contains: term, mode: "insensitive" } },
          { minecraftUuid: { contains: term, mode: "insensitive" } },
          { discordDisplayName: { contains: term, mode: "insensitive" } },
          { discordUsername: { contains: term, mode: "insensitive" } },
          { discordId: { contains: term, mode: "insensitive" } },
          {
            characterSheets: {
              some: {
                name: { contains: term, mode: "insensitive" },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        minecraftUsername: true,
        minecraftUuid: true,
        minecraftAvatarUrl: true,
        minecraftSkinUpdatedAt: true,
        discordUsername: true,
        characterSheets: {
          select: {
            name: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 40,
    }),

    // Tickets : Recherche sur l'intitulé et l'auteur. Tri par date de création du ticket des résultats.
    prisma.ticket.findMany({
      where: {
        AND: [ticketAccessWhere(staffUser)],
        OR: [
          { subject: { contains: term, mode: "insensitive" } },
          {
            player: {
              OR: [
                { minecraftUsername: { contains: term, mode: "insensitive" } },
                { discordDisplayName: { contains: term, mode: "insensitive" } },
                { discordUsername: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        subject: true,
        createdAt: true,
        player: {
          select: {
            minecraftUsername: true,
            discordUsername: true,
            discordDisplayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),

    // Suivis RP de groupe : Recherche sur le nom, la description et les membres du groupe
    prisma.rpTrackingGroup.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          {
            members: {
              some: {
                OR: [
                  { user: { minecraftUsername: { contains: term, mode: "insensitive" } } },
                  { user: { discordDisplayName: { contains: term, mode: "insensitive" } } },
                  { user: { discordUsername: { contains: term, mode: "insensitive" } } },
                  { characterSheet: { name: { contains: term, mode: "insensitive" } } },
                ],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            user: {
              select: {
                minecraftUsername: true,
                discordDisplayName: true,
                discordUsername: true,
              },
            },
            characterSheet: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  // Format des résultats joueurs : Nom RP — Pseudo Minecraft — Pseudo Discord.
  // Si une de ces informations est manquante, "N/A" est affiché en fallback.
  // Tri alphabétique des résultats.
  const players: GlobalSearchPlayerResult[] = rawPlayers
    .map((player) => {
      const activeSheet =
        player.characterSheets.find((sheet) => sheet.status === CharacterStatus.ACTIVE) ??
        player.characterSheets[0] ??
        null;
      const rpName = activeSheet?.name?.trim() || null;

      const rpDisplay = rpName || "N/A";
      const mcDisplay = player.minecraftUsername?.trim() || "N/A";
      const discordDisplay = player.discordUsername?.trim() || "N/A";

      const label = `${rpDisplay} — ${mcDisplay} — ${discordDisplay}`;

      return {
        id: player.id,
        label,
        minecraftUsername: player.minecraftUsername,
        minecraftUuid: player.minecraftUuid,
        minecraftAvatarUrl: player.minecraftAvatarUrl,
        minecraftSkinUpdatedAt: player.minecraftSkinUpdatedAt
          ? player.minecraftSkinUpdatedAt.toISOString()
          : null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base" }));

  // Format des résultats tickets : Intitulé — Pseudo Minecraft/Discord de l'auteur.
  const tickets: GlobalSearchTicketResult[] = rawTickets.map((ticket) => {
    const author =
      ticket.player.minecraftUsername?.trim() ||
      ticket.player.discordUsername?.trim() ||
      ticket.player.discordDisplayName?.trim() ||
      "N/A";

    const label = `${ticket.subject} — ${author}`;

    return {
      id: ticket.id,
      label,
      createdAt: ticket.createdAt.toISOString(),
    };
  });

  // Format des résultats suivis RP de groupe : Nom du groupe et liste des membres
  const rpTrackingGroups: GlobalSearchRpTrackingGroupResult[] = rawGroups
    .map((group) => {
      const memberNames = group.members
        .map((m) => {
          return (
            m.characterSheet?.name?.trim() ||
            m.user.minecraftUsername?.trim() ||
            m.user.discordDisplayName?.trim() ||
            m.user.discordUsername?.trim() ||
            null
          );
        })
        .filter((n): n is string => Boolean(n));

      const count = group.members.length;
      const countLabel = `${count} membre${count > 1 ? "s" : ""}`;
      const membersSummary =
        memberNames.slice(0, 3).join(", ") + (memberNames.length > 3 ? "..." : "");

      const label = membersSummary ? `${group.name} — ${membersSummary}` : group.name;
      const sublabel = membersSummary ? `${countLabel} · ${membersSummary}` : countLabel;

      return {
        id: group.id,
        name: group.name,
        label,
        sublabel,
        membersCount: count,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  return {
    players,
    tickets,
    rpTrackingGroups,
  };
}

"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterStatus, RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { buildDiscordAvatarUrl, fetchDiscordProfileFromApi } from "@/lib/services/discord-sync";
import { syncPlayerWhitelistClassRole } from "@/lib/services/discord-bot-service";

export interface DiscordLookupResult {
  validFormat: boolean;
  foundOnDiscord: boolean;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null;
  existingUser: {
    id: string;
    name: string;
    hasData: boolean;
    status: RegistrationStatus;
  } | null;
}

/**
 * Prévisualise et vérifie un compte Discord avant transfert.
 * Accessible uniquement aux administrateurs.
 */
export async function lookupDiscordAccount(discordId: string): Promise<DiscordLookupResult> {
  await requireRole([Role.ADMIN]);

  const cleanId = discordId.trim();
  const validFormat = /^\d{17,20}$/.test(cleanId);

  if (!validFormat) {
    return {
      validFormat: false,
      foundOnDiscord: false,
      profile: null,
      existingUser: null,
    };
  }

  // 1. Recherche du profil Discord via l'API (Bot Token)
  const profileData = await fetchDiscordProfileFromApi(cleanId);
  const profile = profileData
    ? {
        id: profileData.id,
        username: profileData.username,
        displayName: profileData.global_name ?? profileData.username,
        avatarUrl: buildDiscordAvatarUrl(profileData),
      }
    : null;

  // 2. Vérification si un compte utilisateur existe déjà dans Hyori-Atlas avec cet ID Discord
  const existingUserRecord = await prisma.user.findUnique({
    where: { discordId: cleanId },
    select: {
      id: true,
      discordUsername: true,
      discordDisplayName: true,
      minecraftUsername: true,
      minecraftUuid: true,
      role: true,
      registrationStatus: true,
      _count: {
        select: {
          characterSheets: true,
          tickets: true,
          interviewBookings: true,
          staffNotes: true,
        },
      },
    },
  });

  const existingUser = existingUserRecord
    ? {
        id: existingUserRecord.id,
        name:
          existingUserRecord.minecraftUsername ??
          existingUserRecord.discordDisplayName ??
          existingUserRecord.discordUsername,
        hasData:
          existingUserRecord.minecraftUuid !== null ||
          existingUserRecord._count.characterSheets > 0 ||
          existingUserRecord._count.tickets > 0 ||
          existingUserRecord._count.interviewBookings > 0,
        status: existingUserRecord.registrationStatus,
      }
    : null;

  return {
    validFormat: true,
    foundOnDiscord: !!profile,
    profile,
    existingUser,
  };
}

/**
 * Transfère l'association Discord d'un joueur existant vers un nouveau compte Discord.
 * Conserve toutes les données du joueur (fiches, whitelist, notes, billets, UUID minecraft, etc.).
 */
export async function transferDiscordAccount({
  playerId,
  newDiscordId,
}: {
  playerId: string;
  newDiscordId: string;
}): Promise<{ success: boolean; newDisplayName: string }> {
  const staffUser = await requireRole([Role.ADMIN]);

  const cleanDiscordId = newDiscordId.trim();
  if (!/^\d{17,20}$/.test(cleanDiscordId)) {
    throw new Error("L'identifiant Discord doit être composé de 17 à 20 chiffres (Snowflake).");
  }

  const targetPlayer = await prisma.user.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      discordId: true,
      discordUsername: true,
      discordDisplayName: true,
      discordAvatarUrl: true,
      minecraftUsername: true,
      registrationStatus: true,
      characterSheets: {
        where: { status: CharacterStatus.ACTIVE, assignedClass: { not: null } },
        select: { assignedClass: true },
        take: 1,
      },
    },
  });

  if (!targetPlayer) {
    throw new Error("Joueur introuvable.");
  }

  if (targetPlayer.discordId === cleanDiscordId) {
    throw new Error("Ce joueur est déjà associé à cet identifiant Discord.");
  }

  // Vérifier si un autre utilisateur porte déjà cet ID Discord
  const conflictUser = await prisma.user.findUnique({
    where: { discordId: cleanDiscordId },
    select: {
      id: true,
      minecraftUuid: true,
      minecraftUsername: true,
      discordDisplayName: true,
      discordUsername: true,
      registrationStatus: true,
      _count: {
        select: {
          characterSheets: true,
          tickets: true,
          interviewBookings: true,
        },
      },
    },
  });

  if (conflictUser) {
    if (conflictUser.id === targetPlayer.id) {
      throw new Error("Ce joueur est déjà associé à cet identifiant Discord.");
    }

    const hasData =
      conflictUser.minecraftUuid !== null ||
      conflictUser._count.characterSheets > 0 ||
      conflictUser._count.tickets > 0 ||
      conflictUser._count.interviewBookings > 0;

    if (hasData) {
      const activeName =
        conflictUser.minecraftUsername ??
        conflictUser.discordDisplayName ??
        conflictUser.discordUsername;
      throw new Error(
        `Le compte Discord cible est déjà associé à un autre joueur actif avec des données (${activeName}). Le transfert a été annulé par sécurité.`
      );
    }
  }

  // Récupération des informations fraîches Discord via l'API
  const profileData = await fetchDiscordProfileFromApi(cleanDiscordId);
  const newDisplayName = profileData?.global_name ?? profileData?.username ?? targetPlayer.discordDisplayName;
  const newUsername = profileData?.username ?? targetPlayer.discordUsername;
  const newAvatarUrl = profileData ? buildDiscordAvatarUrl(profileData) : targetPlayer.discordAvatarUrl;

  await prisma.$transaction(async (tx) => {
    // 1. Si un compte orphelin sans données existait déjà avec ce nouveau Discord ID, on le supprime
    if (conflictUser) {
      await tx.user.delete({
        where: { id: conflictUser.id },
      });
    }

    // 2. Nettoyage des liaisons accounts Discord existantes pour ce joueur
    await tx.account.deleteMany({
      where: {
        userId: targetPlayer.id,
        provider: "discord",
      },
    });

    // 3. Nettoyage préventif si un account orphelin subsiste pour le nouveau Discord ID
    await tx.account.deleteMany({
      where: {
        provider: "discord",
        providerAccountId: cleanDiscordId,
      },
    });

    // 4. Mise à jour de l'utilisateur avec son nouveau Discord ID et ses métadonnées
    await tx.user.update({
      where: { id: targetPlayer.id },
      data: {
        discordId: cleanDiscordId,
        discordUsername: newUsername,
        discordDisplayName: newDisplayName,
        discordAvatarUrl: newAvatarUrl,
      },
    });

    // 5. Création de la liaison Account correspondante pour la connexion OAuth NextAuth
    await tx.account.create({
      data: {
        userId: targetPlayer.id,
        type: "oauth",
        provider: "discord",
        providerAccountId: cleanDiscordId,
      },
    });

    // 6. Enregistrement d'une note de staff d'audit
    await tx.staffNote.create({
      data: {
        playerId: targetPlayer.id,
        authorId: staffUser.id,
        body: `[Système] Compte Discord transféré de l'ID ${targetPlayer.discordId} (${targetPlayer.discordDisplayName}) vers l'ID ${cleanDiscordId} (${newDisplayName} / @${newUsername}).`,
      },
    });
  });

  // 7. Si le joueur est actuellement whitelisté, synchronisation des rôles Discord
  const activeClass = targetPlayer.characterSheets[0]?.assignedClass;
  if (targetPlayer.registrationStatus === RegistrationStatus.WHITELISTED && activeClass) {
    try {
      await syncPlayerWhitelistClassRole(targetPlayer.discordId, false, activeClass);
      await syncPlayerWhitelistClassRole(cleanDiscordId, true, activeClass);
    } catch (e) {
      console.warn("Échec de synchronisation des rôles Discord lors du transfert :", e);
    }
  }

  revalidatePath("/staff/atlas");
  revalidatePath(`/staff/atlas/${playerId}`);

  return {
    success: true,
    newDisplayName,
  };
}

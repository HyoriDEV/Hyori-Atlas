import { notFound } from "next/navigation";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import {
  characterSheetStatusLabels,
  interviewBookingStatusLabels,
  registrationStatusLabels,
  staffNavItems,
} from "@/lib/navigation";
import { SKILL_DEFINITIONS, type SkillValues } from "@/lib/character-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CharacterSheetFields,
  type CharacterSheetFieldValues,
} from "@/components/character-sheet/character-sheet-fields";
import { SkillMap } from "@/components/character-sheet/skill-map";
import { AtlasReviewPanel } from "@/components/dashboard/atlas-review-panel";

export default async function AtlasPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const item = staffNavItems.find((i) => i.href === "/dashboard/atlas")!;
  const staffUser = await requireRole(item.roles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    include: {
      characterSheet: true,
      interviewBookings: { orderBy: { createdAt: "desc" }, include: { slot: true } },
    },
  });

  if (!player) {
    notFound();
  }

  const playerName = player.minecraftUsername ?? player.discordDisplayName;
  const sheet = player.characterSheet;

  const fieldValues: CharacterSheetFieldValues = {
    name: sheet?.name ?? "",
    nickname: sheet?.nickname ?? "",
    age: sheet ? String(sheet.age) : "",
    gender: sheet?.gender ?? "",
    civilStatus: sheet?.civilStatus ?? "",
    heightCm: sheet
      ? String(
          sheet.heightMeters > 10
            ? Math.round(sheet.heightMeters)
            : Math.round(sheet.heightMeters * 100)
        )
      : "",
    description: sheet?.description ?? "",
    background: sheet?.background ?? "",
    additionalComments: sheet?.additionalComments ?? "",
  };

  const skillValues = Object.fromEntries(
    SKILL_DEFINITIONS.map((skill) => [skill.field, sheet ? sheet[skill.field] : 1])
  ) as SkillValues;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={player.discordAvatarUrl ?? undefined} alt={playerName} />
          <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="font-heading text-lg font-semibold">{playerName}</span>
          <span className="text-muted-foreground text-xs">
            {player.discordUsername} · {player.minecraftUuid ?? "Minecraft non lié"}
          </span>
        </div>
        <Badge variant="outline">{registrationStatusLabels[player.registrationStatus]}</Badge>
      </div>

      {staffUser.role === Role.ADMIN && (
        <AtlasReviewPanel
          playerId={player.id}
          pseudo={playerName}
          sheetId={sheet?.id ?? null}
          reviewStatus={sheet?.reviewStatus ?? null}
          registrationStatus={player.registrationStatus}
        />
      )}

      {sheet ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Fiche personnage</span>
            <Badge>{characterSheetStatusLabels[sheet.reviewStatus]}</Badge>
          </div>
          <CharacterSheetFields values={fieldValues} interactive={false} />
          <Card>
            <CardContent>
              <SkillMap values={skillValues} interactive={false} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Ce joueur n&apos;a pas encore rempli sa fiche personnage.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">Historique des entretiens</span>
        {player.interviewBookings.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun entretien réservé.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {player.interviewBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm">
                    {booking.slot.startsAt.toLocaleString("fr-FR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </span>
                  <Badge variant="outline">{interviewBookingStatusLabels[booking.status]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

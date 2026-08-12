import Link from "next/link";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import {
  characterSheetStatusLabels,
  interviewBookingStatusLabels,
  registrationStatusLabels,
  staffNavItems,
} from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AtlasPage() {
  const item = staffNavItems.find((i) => i.href === "/dashboard/atlas")!;
  await requireRole(item.roles);

  const players = await prisma.user.findMany({
    where: {
      OR: [
        { registrationStatus: RegistrationStatus.WHITELIST_IN_PROGRESS },
        { characterSheet: { isNot: null } },
        { interviewBookings: { some: {} } },
      ],
    },
    include: {
      characterSheet: true,
      interviewBookings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Atlas des joueurs</h1>

      {players.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-base font-medium">Aucun joueur pour l&apos;instant</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Les joueurs en cours de whitelist apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {players.map((player) => {
            const playerName = player.minecraftUsername ?? player.discordDisplayName;
            const latestBooking = player.interviewBookings[0];

            return (
              <Link key={player.id} href={`/dashboard/atlas/${player.id}`}>
                <Card className="hover:border-ring/40 transition-colors">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{playerName}</span>
                      <span className="text-muted-foreground text-xs">
                        {player.discordUsername}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {registrationStatusLabels[player.registrationStatus]}
                      </Badge>
                      <Badge
                        variant={
                          player.characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED
                            ? "default"
                            : "secondary"
                        }
                      >
                        {player.characterSheet
                          ? characterSheetStatusLabels[player.characterSheet.reviewStatus]
                          : "Fiche non renseignée"}
                      </Badge>
                      {latestBooking && (
                        <Badge variant="outline">
                          {interviewBookingStatusLabels[latestBooking.status]}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

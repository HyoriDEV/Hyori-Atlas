import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { staffNavItems } from "@/lib/navigation";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WaitlistRowActions } from "@/components/dashboard/waitlist-row-actions";

export default async function WaitlistPage() {
  const item = staffNavItems.find((i) => i.href === "/dashboard/waitlist")!;
  await requireRole(item.roles);

  const players = await prisma.user.findMany({
    where: { registrationStatus: RegistrationStatus.WAITLIST },
    include: {
      registrationHistory: {
        where: { status: RegistrationStatus.WAITLIST },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Liste d'attente</h1>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>Minecraft</TableHead>
              <TableHead>Liaison</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => {
              const playerName = player.minecraftUsername ?? player.discordDisplayName;
              const waitlistedDate = player.registrationHistory[0]?.createdAt;

              return (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage
                          src={player.discordAvatarUrl ?? undefined}
                          alt={playerName}
                        />
                        <AvatarFallback>{playerName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{playerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{player.discordUsername}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {player.minecraftUsername ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {waitlistedDate ? waitlistedDate.toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    <WaitlistRowActions userId={player.id} pseudo={playerName} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {players.length === 0 && (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Aucun joueur en attente.
          </p>
        )}
      </Card>
    </div>
  );
}

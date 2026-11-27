import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CaretRight } from "@phosphor-icons/react/dist/ssr";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Trames partagées" };

export default async function SharedTramesPage() {
  const user = await requireActivePlayer();
  const trames = await prisma.characterSheet.findMany({
    where: {
      trameShares: { some: { recipientId: user.id } },
      chapters: { some: {} },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      player: { select: { minecraftUsername: true, discordDisplayName: true } },
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <h1 className="font-heading text-2xl font-semibold">Trames partagées</h1>
      {trames.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune trame n’a été partagée avec toi pour le moment.
        </p>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {trames.map(({ id, name, player }) => (
            <li key={id}>
              <Link
                href={`/player/shared-trames/${id}`}
                prefetch={false}
                className="hover:bg-muted/40 focus-visible:bg-muted/40 flex items-center gap-3 px-4 py-3"
              >
                <BookOpen className="text-primary size-4 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium break-words">
                    {name || "Personnage sans nom"}
                  </span>
                  <span className="text-muted-foreground text-xs break-words">
                    {player.minecraftUsername ?? player.discordDisplayName}
                  </span>
                </span>
                <CaretRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

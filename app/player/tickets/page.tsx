import Link from "next/link";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewTicketDialog } from "@/components/player/new-ticket-dialog";

const ticketStatusBadgeVariant: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  [TicketStatus.PENDING_STAFF]: "default",
  [TicketStatus.PENDING_PLAYER]: "secondary",
  [TicketStatus.ARCHIVED]: "outline",
};

export default async function TicketsPage() {
  const user = await requireUser();

  const tickets = await prisma.ticket.findMany({
    where: { playerId: user.id, status: { not: TicketStatus.ARCHIVED } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Tickets</h1>
        <NewTicketDialog />
      </div>

      {tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-base font-medium">Rien à voir pour l'instant !</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Créé un ticket pour poser une question ou signaler un problème à l'équipe du staff.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/player/tickets/${ticket.id}`}>
              <Card className="hover:border-ring/40 transition-colors">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {ticketCategoryLabels[ticket.category]} ·{" "}
                      {ticket.createdAt.toLocaleDateString("fr-FR")}
                    </span>
                    <span className="text-sm font-medium">{ticket.subject}</span>
                  </div>
                  <Badge variant={ticketStatusBadgeVariant[ticket.status]}>
                    {ticketStatusLabels[ticket.status]}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

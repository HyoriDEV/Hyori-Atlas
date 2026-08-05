import { notFound } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TicketMessageAuthorType } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { TicketMessageForm } from "@/components/player/ticket-message-form";
import { TicketBackLink } from "@/components/player/ticket-back-link";

export default async function TicketDetailPage({
  params,
}: PageProps<"/player/tickets/[ticketId]">) {
  const { ticketId } = await params;
  const user = await requireUser();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket || ticket.playerId !== user.id) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <TicketBackLink />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {ticketCategoryLabels[ticket.category]} · {ticket.createdAt.toLocaleDateString("fr-FR")}
          </span>
          <span className="font-heading text-lg font-semibold">{ticket.subject}</span>
        </div>
        <Badge>{ticketStatusLabels[ticket.status]}</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          {ticket.messages.map((message) =>
            message.authorType === TicketMessageAuthorType.SYSTEM ? (
              <div
                key={message.id}
                className="text-muted-foreground bg-muted mx-auto rounded-full px-3 py-1 text-xs"
              >
                {message.body}
              </div>
            ) : (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarImage
                    src={user.discordAvatarUrl ?? undefined}
                    alt={user.minecraftUsername ?? user.discordUsername ?? ""}
                  />
                  <AvatarFallback>
                    {(user.minecraftUsername ?? user.discordUsername ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {user.minecraftUsername ?? user.discordUsername}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {message.createdAt.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <TicketMessageForm ticketId={ticket.id} />
    </div>
  );
}

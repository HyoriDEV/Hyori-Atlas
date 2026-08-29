import Link from "next/link";

import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@/lib/generated/prisma/enums";
import { ticketCategoryLabels, ticketStatusLabels } from "@/lib/navigation";
import { ticketStatusBadgeVariant } from "@/lib/atlas-status";
import { formatDate } from "@/lib/date";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { NewTicketDialog } from "@/components/player/new-ticket-dialog";
import { TicketsArchiveTabs } from "@/components/player/tickets-archive-tabs";

type TicketListItem = {
  id: string;
  category: keyof typeof ticketCategoryLabels;
  subject: string;
  status: TicketStatus;
  createdAt: Date;
  conversation?: {
    members: {
      userId: string;
      user: {
        id: string;
        minecraftUsername: string | null;
        discordDisplayName: string;
        discordAvatarUrl: string | null;
      };
    }[];
  } | null;
};

function TicketList({
  tickets,
  emptyTitle,
  emptyDescription,
}: {
  tickets: TicketListItem[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (tickets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-base font-medium">{emptyTitle}</p>
          {emptyDescription && (
            <p className="text-muted-foreground max-w-sm text-sm">{emptyDescription}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((ticket) => (
        <Link key={ticket.id} href={`/player/tickets/${ticket.id}`}>
          <Card size="sm" className="hover:border-ring/40 transition-colors">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                  <span>
                    {ticketCategoryLabels[ticket.category]} ·{" "}
                    {formatDate(ticket.createdAt, { style: "prefix-long", withTime: true })}
                  </span>
                  {ticket.conversation?.members && ticket.conversation.members.length > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        {ticket.conversation.members.map((member) => {
                          const name =
                            member.user.minecraftUsername ?? member.user.discordDisplayName;
                          return member.user.minecraftUsername ? (
                            <SkinHead
                              key={member.userId}
                              username={member.user.minecraftUsername}
                              className="size-4.5 rounded-xs"
                              title={name}
                            />
                          ) : (
                            <Avatar key={member.userId} className="size-4.5">
                              <AvatarImage
                                src={member.user.discordAvatarUrl ?? undefined}
                                alt={name}
                              />
                              <AvatarFallback className="text-[9px]">
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm font-medium">{ticket.subject}</span>
              </div>
              <Badge variant={ticketStatusBadgeVariant(ticket.status)}>
                {ticketStatusLabels[ticket.status]}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function TicketsPage(props: { searchParams: Promise<{ archived?: string }> }) {
  const user = await requireActivePlayer();
  const searchParams = await props.searchParams;
  const activeTab = searchParams.archived === "1" ? "archived" : "active";

  const userFilter = {
    conversation: { members: { some: { userId: user.id } } },
  };

  const [activeTickets, archivedTickets] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...userFilter, status: { not: TicketStatus.ARCHIVED } },
      include: {
        conversation: {
          include: {
            members: {
              orderBy: { joinedAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    minecraftUsername: true,
                    discordDisplayName: true,
                    discordAvatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticket.findMany({
      where: { ...userFilter, status: TicketStatus.ARCHIVED },
      include: {
        conversation: {
          include: {
            members: {
              orderBy: { joinedAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    minecraftUsername: true,
                    discordDisplayName: true,
                    discordAvatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Tes tickets</h1>
        <NewTicketDialog />
      </div>

      <TicketsArchiveTabs
        activeTab={activeTab}
        activeCount={activeTickets.length}
        archivedCount={archivedTickets.length}
      >
        <TabsContent value="active">
          <TicketList
            tickets={activeTickets}
            emptyTitle="Rien à voir pour l'instant !"
            emptyDescription="Pose une question ou signale un problème au staff ici."
          />
        </TabsContent>
        <TabsContent value="archived">
          <TicketList
            tickets={archivedTickets}
            emptyTitle="Rien à voir pour l'instant !"
            emptyDescription="Les tickets archivés par le staff apparaîtront ici."
          />
        </TabsContent>
      </TicketsArchiveTabs>
    </div>
  );
}

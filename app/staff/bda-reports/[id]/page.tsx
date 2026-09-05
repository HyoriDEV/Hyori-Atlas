import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { formatDate } from "@/lib/date";
import { bdaReportStatusBadgeVariant } from "@/lib/atlas-status";
import { bdaReportStatusLabels } from "@/lib/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import { Link as LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { AtlasBackButton } from "@/components/dashboard/atlas-back-button";
import { BdaReportActions } from "@/components/dashboard/bda-report-actions";
import { BdaAttachmentsGallery } from "@/components/dashboard/bda-attachments-gallery";

const bdaRoles = [Role.ADMIN, Role.CONFLICT_MANAGEMENT];

export default async function BdaReportDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireRole(bdaRoles);

  const params = await props.params;
  const report = await prisma.bdaReport.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      staffMembers: {
        include: { user: true },
      },
      parties: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
      attachments: true,
      ticket: {
        include: { player: true },
      },
    },
  });

  if (!report) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex shrink-0 items-center gap-3">
        <AtlasBackButton href="/staff/bda-reports" />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {formatDate(report.createdAt, { style: "prefix-long", withTime: true })}
          </span>
          <span className="font-heading text-lg font-semibold">{report.title}</span>
        </div>
        <Badge variant={bdaReportStatusBadgeVariant(report.status)}>
          {bdaReportStatusLabels[report.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description des faits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {report.description}
              </div>
            </CardContent>
          </Card>

          {report.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pièces jointes</CardTitle>
                <CardDescription className="text-xs">
                  Clique sur une image pour l&apos;agrandir en plein écran.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BdaAttachmentsGallery attachments={report.attachments} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Comité GC</CardTitle>
              <CardDescription className="text-xs">
                Membres du staff en charge du dossier.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="font-heading text-sm font-semibold">Auteur du rapport</h3>
                <div className="border-border flex flex-col gap-2.5 border-l-2 pl-3">
                  {report.createdBy ? (
                    <Link
                      href={`/staff/atlas/${report.createdBy.id}`}
                      className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
                    >
                      {report.createdBy.minecraftUsername ? (
                        <SkinHead
                          username={report.createdBy.minecraftUsername}
                          className="size-8 rounded-lg"
                        />
                      ) : (
                        <Avatar className="size-8 rounded-lg">
                          <AvatarImage src={report.createdBy.discordAvatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs font-semibold">
                            {(report.createdBy.discordDisplayName ??
                              report.createdBy.discordUsername)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium">
                          {report.createdBy.minecraftUsername ??
                            report.createdBy.discordDisplayName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {report.createdBy.discordUsername}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-sm">Créateur non renseigné.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-heading text-sm font-semibold">Staffs participants</h3>
                <div className="border-border flex flex-col gap-2.5 border-l-2 pl-3">
                  {report.staffMembers.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      Aucun participant supplémentaire.
                    </span>
                  ) : (
                    report.staffMembers.map((member) => (
                      <Link
                        key={member.id}
                        href={`/staff/atlas/${member.user.id}`}
                        className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
                      >
                        {member.user.minecraftUsername ? (
                          <SkinHead
                            username={member.user.minecraftUsername}
                            className="size-8 rounded-lg"
                          />
                        ) : (
                          <Avatar className="size-8 rounded-lg">
                            <AvatarImage src={member.user.discordAvatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs font-semibold">
                              {(member.user.discordDisplayName ??
                                member.user.discordUsername)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium">
                            {member.user.minecraftUsername ?? member.user.discordDisplayName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {member.user.discordUsername}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parties impliquées</CardTitle>
              <CardDescription className="text-xs">
                Joueurs concernés par le conflit.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {report.ticket && (
                <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                  <LinkIcon className="size-3.5 shrink-0" />
                  <span>Ticket lié :</span>
                  <Link
                    href={`/staff/tickets/${report.ticket.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline"
                  >
                    {report.ticket.subject}
                  </Link>
                </div>
              )}

              {report.parties.map((party) => (
                <div key={party.id} className="flex flex-col gap-3">
                  <h3 className="font-heading text-sm font-semibold">{party.name}</h3>
                  <div className="border-border flex flex-col gap-2.5 border-l-2 pl-3">
                    {party.members.length === 0 ? (
                      <span className="text-muted-foreground text-sm">Aucun joueur renseigné.</span>
                    ) : (
                      party.members.map((member) => (
                        <Link
                          key={member.id}
                          href={`/staff/atlas/${member.user.id}`}
                          className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
                        >
                          {member.user.minecraftUsername ? (
                            <SkinHead
                              username={member.user.minecraftUsername}
                              className="size-8 rounded-lg"
                            />
                          ) : (
                            <Avatar className="size-8 rounded-lg">
                              <AvatarImage src={member.user.discordAvatarUrl ?? undefined} />
                              <AvatarFallback className="text-xs font-semibold">
                                {(member.user.discordDisplayName ??
                                  member.user.discordUsername)[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium">
                              {member.user.minecraftUsername ?? member.user.discordDisplayName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {member.user.discordUsername}
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <BdaReportActions reportId={report.id} currentStatus={report.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

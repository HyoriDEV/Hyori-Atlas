"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, PencilSimple, Plus } from "@phosphor-icons/react";

import {
  characterSheetStatusBadgeVariant,
  registrationStatusBadgeVariant,
} from "@/lib/atlas-status";
import { characterSheetStatusLabels, registrationStatusLabels } from "@/lib/navigation";
import {
  CharacterClass,
  CharacterSheetStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { AssignPlayerGroupDialog } from "@/components/staff/groups/assign-player-group-dialog";

export interface AtlasPlayerGroupMember {
  id: string;
  discordDisplayName: string;
  minecraftUsername: string | null;
  discordAvatarUrl: string | null;
  registrationStatus: RegistrationStatus;
  characterSheets: Array<{
    name: string;
    reviewStatus: CharacterSheetStatus;
    assignedClass?: CharacterClass | null;
  }>;
}

export interface AtlasPlayerGroup {
  id: string;
  name: string;
  description: string | null;
  members: AtlasPlayerGroupMember[];
}

interface AtlasPlayerGroupCardProps {
  playerId: string;
  playerPseudo: string;
  group: AtlasPlayerGroup | null;
  declaredGroupMembers?: string | null;
  allGroups: Array<{
    id: string;
    name: string;
    memberCount?: number;
  }>;
  canManageGroups?: boolean;
}

export function AtlasPlayerGroupCard({
  playerId,
  playerPseudo,
  group,
  allGroups,
  canManageGroups = true,
}: AtlasPlayerGroupCardProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // If group exists, compute basic summary
  const memberCount = group?.members.length ?? 0;

  return (
    <>
      <Card className="flex h-full flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Groupe RP
            </span>
            {group && (
              <span className="text-muted-foreground text-xs">
                ({memberCount} membre{memberCount > 1 ? "s" : ""})
              </span>
            )}
          </div>

          {canManageGroups && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              {group ? (
                <>
                  <PencilSimple className="size-3.5" />
                  <span>Gérer le groupe</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Assigner un groupe</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Content */}
        {group ? (
          <div className="flex flex-1 flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href="/staff/groups"
                  className="text-foreground flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <span className="truncate">{group.name}</span>
                  <ArrowSquareOut className="text-muted-foreground size-3.5 shrink-0" />
                </Link>
                {group.description && (
                  <p className="text-muted-foreground line-clamp-2 text-xs">{group.description}</p>
                )}
              </div>
            </div>

            {/* Members preview */}
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-semibold">
                Membres du groupe :
              </span>
              <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto pr-1">
                {group.members.map((m) => {
                  const isCurrent = m.id === playerId;
                  const name = m.minecraftUsername ?? m.discordDisplayName;
                  const sheet = m.characterSheets[0];

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-2 rounded-md p-2 text-xs transition-colors ${
                        isCurrent
                          ? "bg-primary/10 border-primary/20 border"
                          : "bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/staff/atlas/${m.id}`}
                          className="shrink-0 transition-opacity hover:opacity-80"
                          title={`Voir la fiche Atlas de ${name}`}
                        >
                          {m.minecraftUsername ? (
                            <SkinHead size="sm" username={m.minecraftUsername} />
                          ) : (
                            <Avatar size="sm">
                              <AvatarImage src={m.discordAvatarUrl ?? undefined} alt={name} />
                              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          )}
                        </Link>
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/staff/atlas/${m.id}`}
                              className={`truncate hover:underline ${
                                isCurrent ? "text-primary font-semibold" : "font-medium"
                              }`}
                            >
                              {name}
                            </Link>
                            {isCurrent && (
                              <span className="text-primary/80 text-[10px] font-normal">
                                (ce joueur)
                              </span>
                            )}
                          </div>
                          {sheet && (
                            <span className="text-muted-foreground truncate text-[11px]">
                              {sheet.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant={registrationStatusBadgeVariant(m.registrationStatus)}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {registrationStatusLabels[m.registrationStatus]}
                        </Badge>
                        {sheet && (
                          <Badge
                            variant={characterSheetStatusBadgeVariant(sheet.reviewStatus)}
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {characterSheetStatusLabels[sheet.reviewStatus]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Aucun groupe RP assigné à ce joueur.</p>
        )}
      </Card>

      <AssignPlayerGroupDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        playerId={playerId}
        playerPseudo={playerPseudo}
        currentGroupId={group?.id ?? null}
        availableGroups={allGroups}
      />
    </>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChatCircle } from "@phosphor-icons/react";

import type { StaffWritingStory } from "@/lib/services/staff-writing-service";
import { formatDate } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketTableRow } from "@/components/dashboard/ticket-table-row";

export function WritingTable({ stories, query }: { stories: StaffWritingStory[]; query: string }) {
  const COLUMN_COUNT = 6;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Auteur & Personnage</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead>Dernier chapitre</TableHead>
          <TableHead>Dernière modification</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stories.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={COLUMN_COUNT}
              className="text-muted-foreground py-10 text-center text-sm"
            >
              {query
                ? "Aucune trame ne correspond à cette recherche."
                : "Aucune trame rédigée par un joueur pour le moment."}
            </TableCell>
          </TableRow>
        ) : (
          stories.map((story) => {
            const readHref = `/staff/writing/${story.playerId}?characterId=${story.characterId}`;
            const rpTrackingHref = `/staff/rp-tracking/${story.playerId}`;

            return (
              <TicketTableRow key={story.characterId} href={readHref}>
                {/* Auteur & Personnage */}
                <TableCell className="py-3 pl-6">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/staff/atlas/${story.playerId}`}
                      className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
                      title={`Voir la fiche Atlas de ${story.playerName}`}
                    >
                      {story.minecraftUsername ? (
                        <SkinHead size="sm" username={story.minecraftUsername} />
                      ) : (
                        <Avatar size="sm">
                          <AvatarImage
                            src={story.discordAvatarUrl ?? undefined}
                            alt={story.playerName}
                          />
                          <AvatarFallback>
                            {story.playerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{story.characterName}</span>
                        {story.characterClassName && (
                          <Badge variant="secondary" className="text-xs">
                            {story.characterClassName}
                          </Badge>
                        )}
                      </div>
                      <Link
                        href={`/staff/atlas/${story.playerId}`}
                        className="text-muted-foreground hover:text-foreground truncate text-xs hover:underline"
                        title={`Voir la fiche Atlas de ${story.playerName}`}
                      >
                        Auteur : {story.playerName}
                      </Link>
                    </div>
                  </div>
                </TableCell>

                {/* Volume */}
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {story.wordCount.toLocaleString("fr-FR")} mot{story.wordCount > 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {story.chapterCount} chapitre{story.chapterCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </TableCell>

                {/* Dernier chapitre */}
                <TableCell className="max-w-xs">
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate text-sm font-medium">
                      {story.lastChapterTitle || "Chapitre sans titre"}
                    </span>
                  </div>
                </TableCell>

                {/* Date */}
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDate(story.lastUpdatedAt, { style: "chat", fallback: "—" })}
                </TableCell>

                {/* Actions */}
                <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      render={
                        <Link
                          href={rpTrackingHref}
                          prefetch={false}
                          title={`Ouvrir le salon Suivi RP de ${story.playerName}`}
                        />
                      }
                      className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2.5 text-xs"
                    >
                      <ChatCircle className="size-3.5" />
                      Suivi RP
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={readHref} prefetch={false} />}
                      className="h-8 gap-1.5 px-2.5 text-xs"
                    >
                      Lire
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </TableCell>
              </TicketTableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

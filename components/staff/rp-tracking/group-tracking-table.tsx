"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChatCircle,
  BookOpen,
  MagnifyingGlass,
  ArrowSquareOut,
  Trash,
  CircleNotch,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import type { RpTrackingGroupSummary } from "@/lib/services/group-rp-tracking-service";
import type { PlayerOption } from "@/components/player-select";
import { SkinHead } from "@/components/ui/skin-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateGroupDialog } from "@/components/staff/rp-tracking/create-group-dialog";
import { EditGroupDialog } from "@/components/staff/rp-tracking/edit-group-dialog";
import { deleteRpTrackingGroupAction } from "@/lib/actions/group-rp-tracking-actions";

export function GroupTrackingTable({
  groups,
  availablePlayers,
}: {
  groups: RpTrackingGroupSummary[];
  availablePlayers: PlayerOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "handled">("all");
  const [deletingGroup, setDeletingGroup] = useState<RpTrackingGroupSummary | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Filtre statut
      if (filter === "pending" && !g.isPending) return false;
      if (filter === "handled" && g.isPending) return false;

      // Recherche textuelle
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchDesc = g.description?.toLowerCase().includes(q) ?? false;
      const matchMember = g.members.some(
        (m) =>
          m.playerName.toLowerCase().includes(q) ||
          m.minecraftUsername?.toLowerCase().includes(q) ||
          m.discordUsername.toLowerCase().includes(q) ||
          m.character?.name.toLowerCase().includes(q)
      );

      return matchName || matchDesc || matchMember;
    });
  }, [groups, filter, search]);

  const pendingCount = useMemo(() => groups.filter((g) => g.isPending).length, [groups]);
  const handledCount = useMemo(() => groups.filter((g) => !g.isPending).length, [groups]);

  function handleDeleteConfirm() {
    if (!deletingGroup) return;

    startDeleteTransition(async () => {
      const res = await deleteRpTrackingGroupAction(deletingGroup.id);
      if (!res.success) {
        toast.error(res.error || "Échec de la suppression.");
        return;
      }

      toast.success(`Le groupe « ${deletingGroup.name} » a été supprimé.`);
      setDeletingGroup(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils et création */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un groupe, un membre..."
              className="pl-8 text-sm"
            />
          </div>

          {/* Filtres de statut */}
          <div className="bg-muted inline-flex rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                filter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tous ({groups.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filter === "pending"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>À traiter</span>
              {pendingCount > 0 && (
                <Badge variant="default" className="h-4.5 px-1.5 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setFilter("handled")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                filter === "handled"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Traités ({handledCount})
            </button>
          </div>
        </div>

        <CreateGroupDialog availablePlayers={availablePlayers} />
      </div>

      {/* Tableau des groupes */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Groupe RP</TableHead>
              <TableHead className="w-[30%]">
                Membres ({groups.reduce((acc, g) => acc + g.memberCount, 0)} au total)
              </TableHead>
              <TableHead className="text-center">Narration</TableHead>
              <TableHead className="text-center">Échanges</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-32 text-center text-sm">
                  {groups.length === 0
                    ? "Aucun groupe de suivi RP n'a encore été créé."
                    : "Aucun groupe ne correspond à votre recherche."}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <TableRow key={group.id} className="hover:bg-muted/40 transition-colors">
                  {/* Nom & Description */}
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/staff/rp-tracking/groups/${group.id}`}
                        className="text-foreground hover:text-primary font-heading font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
                      {group.description && (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {group.description}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[11px]">
                        Créé le {formatDate(group.createdAt)}
                        {group.createdByName && ` par ${group.createdByName}`}
                      </p>
                    </div>
                  </TableCell>

                  {/* Membres du groupe */}
                  <TableCell>
                    {group.members.length === 0 ? (
                      <span className="text-muted-foreground text-xs italic">Aucun membre</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {group.members.slice(0, 4).map((member) => (
                          <div
                            key={member.userId}
                            className="bg-muted/60 border-border inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-xs"
                            title={`${member.playerName}${member.character ? ` (${member.character.name})` : ""}`}
                          >
                            <SkinHead
                              username={member.minecraftUsername}
                              avatarUrl={member.discordAvatarUrl}
                              size="sm"
                            />
                            <span className="font-medium">{member.playerName}</span>
                            {member.character && (
                              <span className="text-muted-foreground text-[10px]">
                                · {member.character.name}
                              </span>
                            )}
                          </div>
                        ))}
                        {group.members.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{group.members.length - 4} autres
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Chapitres */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <BookOpen className="size-3.5" />
                      <span>{group.chapterCount} chap.</span>
                    </Badge>
                  </TableCell>

                  {/* Messages */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <ChatCircle className="size-3.5" />
                      <span>{group.messageCount}</span>
                    </Badge>
                  </TableCell>

                  {/* Statut */}
                  <TableCell>
                    {group.isPending ? (
                      <Badge variant="default" className="text-xs">
                        À traiter
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground text-xs font-normal"
                      >
                        Traité
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        render={<Link href={`/staff/rp-tracking/groups/${group.id}`} />}
                      >
                        <span>Ouvrir</span>
                        <ArrowSquareOut className="size-3.5" />
                      </Button>
                      <EditGroupDialog group={group} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 size-8 p-0"
                        onClick={() => setDeletingGroup(group)}
                        title="Supprimer le groupe"
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe de suivi RP ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le groupe{" "}
              <strong>« {deletingGroup?.name} »</strong> ?
              <br />
              Cette action supprimera également tous les échanges et chapitres associés pour
              l&apos;ensemble des membres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <CircleNotch className="size-4 animate-spin" />
                  <span>Suppression...</span>
                </>
              ) : (
                <span>Supprimer définitivement</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowClockwise,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  MagnifyingGlass,
  ShieldCheck,
  Users,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  getWhitelistedPlayersRoleAuditAction,
  resyncSingleWhitelistedPlayerRolesAction,
  type WhitelistedPlayerRoleAuditItem,
  type WhitelistRoleAuditSummary,
} from "@/lib/actions/whitelist-role-verification-actions";
import { CHARACTER_CLASSES, type CharacterClass } from "@/lib/character-classes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkinHead } from "@/components/ui/skin-head";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface WhitelistRoleVerificationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function WhitelistRoleVerificationDialog({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger,
}: WhitelistRoleVerificationDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const [players, setPlayers] = useState<WhitelistedPlayerRoleAuditItem[]>([]);
  const [summary, setSummary] = useState<WhitelistRoleAuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "anomalies" | "compliant">("all");
  const [syncingPlayerId, setSyncingPlayerId] = useState<string | null>(null);
  const [copiedDiscordId, setCopiedDiscordId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadData() {
    setIsLoading(true);
    try {
      const res = await getWhitelistedPlayersRoleAuditAction();
      if (!res.success) {
        toast.error(res.error || "Impossible de récupérer l'audit des rôles.");
      } else {
        setPlayers(res.players);
        setSummary(res.summary);
      }
    } catch {
      toast.error("Erreur de connexion lors du chargement des rôles Discord.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (isControlled) {
      externalOnOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
    if (newOpen) {
      loadData();
    }
  }

  function handleCopyDiscordId(discordId: string) {
    navigator.clipboard.writeText(discordId);
    setCopiedDiscordId(discordId);
    setTimeout(() => setCopiedDiscordId(null), 2000);
    toast.success("ID Discord copié dans le presse-papier.");
  }

  function handleResync(player: WhitelistedPlayerRoleAuditItem) {
    if (syncingPlayerId) return;
    setSyncingPlayerId(player.id);

    startTransition(async () => {
      try {
        const res = await resyncSingleWhitelistedPlayerRolesAction(player.id);
        if (!res.success || !res.updatedPlayer) {
          toast.error(
            res.error || `Échec de l'attribution des rôles Discord pour ${player.rpName}.`
          );
        } else {
          const updated = res.updatedPlayer;
          setPlayers((prev) => {
            const next = prev.map((p) => (p.id === updated.id ? updated : p));
            // Ré-ordonner : anomalies en tête
            next.sort((a, b) => {
              if (a.hasAnomaly && !b.hasAnomaly) return -1;
              if (!a.hasAnomaly && b.hasAnomaly) return 1;
              if (a.hasAnomaly && b.hasAnomaly) {
                if (a.missingRoles.length !== b.missingRoles.length) {
                  return b.missingRoles.length - a.missingRoles.length;
                }
              }
              return a.rpName.localeCompare(b.rpName, "fr", { sensitivity: "base" });
            });
            return next;
          });

          // Mettre à jour le résumé
          setSummary((prev) => {
            if (!prev) return null;
            const diffAnomaly = (player.hasAnomaly ? 1 : 0) - (updated.hasAnomaly ? 1 : 0);
            return {
              ...prev,
              anomalies: Math.max(0, prev.anomalies - diffAnomaly),
              compliant: prev.compliant + diffAnomaly,
            };
          });

          if (!updated.hasAnomaly) {
            toast.success(
              `Rôles Whitelist et ${updated.assignedClassLabel ?? "Classe"} attribués avec succès à ${updated.rpName} !`
            );
          } else {
            toast.warning(
              `Rôles mis à jour pour ${updated.rpName}, mais des anomalies persistent : ${updated.missingRoles.join(", ")}.`
            );
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de la synchronisation.");
      } finally {
        setSyncingPlayerId(null);
      }
    });
  }

  const filteredPlayers = useMemo(() => {
    let result = players;

    if (filterMode === "anomalies") {
      result = result.filter((p) => p.hasAnomaly);
    } else if (filterMode === "compliant") {
      result = result.filter((p) => !p.hasAnomaly);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const rp = p.rpName.toLowerCase();
        const mc = (p.minecraftUsername ?? "").toLowerCase();
        const dName = p.discordDisplayName.toLowerCase();
        const dUser = (p.discordUsername ?? "").toLowerCase();
        const dId = p.discordId;
        const cls = (p.assignedClassLabel ?? "").toLowerCase();
        return (
          rp.includes(q) ||
          mc.includes(q) ||
          dName.includes(q) ||
          dUser.includes(q) ||
          dId.includes(q) ||
          cls.includes(q)
        );
      });
    }

    return result;
  }, [players, filterMode, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}

      <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col p-0 sm:max-h-[85vh]">
        {/* En-tête */}
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <ShieldCheck className="size-5" />
              </div>
              <DialogTitle className="text-lg font-semibold">
                Vérification des rôles Whitelist Discord
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Vérifie en temps réel que chaque joueur whitelisté en base possède bien le rôle
              Whitelisté ainsi que le rôle correspondant à sa classe RP sur le serveur Discord.
            </DialogDescription>
          </div>

          {/* KPI Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-muted/50 border-border/70 flex items-center gap-1.5 rounded-md border px-2.5 py-1">
                <Users className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground">Total whitelistés :</span>
                <span className="text-foreground font-semibold">
                  {summary?.total ?? players.length}
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors",
                  (summary?.anomalies ?? 0) > 0
                    ? "border-destructive/40 bg-destructive/15 text-destructive font-semibold"
                    : "border-border/70 bg-muted/30 text-muted-foreground"
                )}
              >
                <WarningCircle className="size-3.5 shrink-0" />
                <span>Rôles manquants :</span>
                <span className="font-bold">{summary?.anomalies ?? 0}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-3.5 shrink-0" />
                <span>Rôles conformes :</span>
                <span className="font-semibold">{summary?.compliant ?? 0}</span>
              </div>

              {summary && !summary.botReachable && (
                <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                  <XCircle className="size-3.5" />
                  <span>Bot Discord injoignable ({summary.errorMessage ?? "Erreur"})</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowClockwise className={cn("size-3.5", isLoading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </DialogHeader>

        {/* Filtres & Recherche */}
        <div className="border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5 text-xs">
          <div className="relative max-w-sm min-w-[220px] flex-1">
            <MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom RP, pseudo, Discord..."
              className="h-8 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground mr-1 text-[11px]">Filtrer :</span>
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
              className="h-7 px-2.5 text-xs"
            >
              Tous ({players.length})
            </Button>
            <Button
              variant={filterMode === "anomalies" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFilterMode("anomalies")}
              className={cn(
                "h-7 px-2.5 text-xs",
                filterMode !== "anomalies" &&
                  (summary?.anomalies ?? 0) > 0 &&
                  "border-destructive/40 text-destructive hover:bg-destructive/10"
              )}
            >
              Anomalies ({summary?.anomalies ?? 0})
            </Button>
            <Button
              variant={filterMode === "compliant" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("compliant")}
              className="h-7 px-2.5 text-xs"
            >
              Conformes ({summary?.compliant ?? 0})
            </Button>
          </div>
        </div>

        {/* Tableau */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CircleNotch className="text-primary size-8 animate-spin" />
              <p className="text-muted-foreground mt-3 text-xs">
                Audit des rôles Discord en cours via HyoriBot...
              </p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-xl border p-12 text-center">
              <ShieldCheck className="text-muted-foreground size-10" />
              <p className="text-foreground mt-3 text-sm font-semibold">
                Aucun joueur ne correspond aux critères
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {searchQuery
                  ? "Essayez de modifier votre recherche."
                  : filterMode === "anomalies"
                    ? "Excellente nouvelle ! Tous les joueurs whitelistés ont bien leurs rôles Discord attribués."
                    : "Aucun joueur whitelisté trouvé."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground border-b text-[11px] font-semibold tracking-wider uppercase">
                    <tr>
                      <th className="px-4 py-3">Joueur RP / Minecraft</th>
                      <th className="px-4 py-3">Compte Discord</th>
                      <th className="px-4 py-3">Classe attribuée</th>
                      <th className="px-4 py-3">Rôles Discord constatés</th>
                      <th className="px-4 py-3">État</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {filteredPlayers.map((player) => {
                      const isSyncing = syncingPlayerId === player.id;
                      const classDef = player.assignedClass
                        ? CHARACTER_CLASSES.find((c) => c.id === player.assignedClass)
                        : null;
                      const ClassIcon = classDef?.icon;

                      return (
                        <tr
                          key={player.id}
                          className={cn(
                            "transition-colors",
                            player.hasAnomaly
                              ? "border-l-destructive bg-destructive/[0.07] hover:bg-destructive/[0.12] border-l-4"
                              : "hover:bg-muted/30"
                          )}
                        >
                          {/* 1. Joueur RP / Minecraft */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <SkinHead
                                username={player.minecraftUsername}
                                avatarUrl={player.minecraftSkinUrl}
                                size="sm"
                                className="ring-border/50 size-8 rounded-md ring-1"
                              />
                              <div className="flex flex-col">
                                <span className="text-foreground text-xs font-semibold">
                                  {player.rpName}
                                </span>
                                {player.minecraftUsername && (
                                  <span className="text-muted-foreground text-[11px]">
                                    {player.minecraftUsername}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Discord */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-7 border">
                                <AvatarImage src={player.discordAvatarUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {player.discordDisplayName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="text-foreground text-xs font-medium">
                                    {player.discordDisplayName}
                                  </span>
                                  {player.discordUsername && (
                                    <span className="text-muted-foreground text-[10px]">
                                      (@{player.discordUsername})
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                                  <span>ID: {player.discordId}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDiscordId(player.discordId)}
                                    className="hover:text-foreground"
                                    title="Copier l'identifiant"
                                  >
                                    {copiedDiscordId === player.discordId ? (
                                      <Check className="size-2.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="size-2.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Classe attribuée */}
                          <td className="px-4 py-3">
                            {player.assignedClass ? (
                              <Badge variant="outline" className="gap-1 text-[11px] font-medium">
                                {ClassIcon && <ClassIcon size={12} className="shrink-0" />}
                                {player.assignedClassLabel ?? player.assignedClass}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Non définie
                              </Badge>
                            )}
                          </td>

                          {/* 4. Rôles Discord constatés */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Rôle Whitelist */}
                              {player.hasWhitelistRole ? (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                                >
                                  <Check className="size-3" />
                                  Whitelist
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="gap-1 text-[10px] font-semibold"
                                >
                                  <X className="size-3" />
                                  Whitelist manquante
                                </Badge>
                              )}

                              {/* Rôle Classe */}
                              {player.assignedClass && (
                                <>
                                  {player.hasClassRole ? (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400"
                                    >
                                      <Check className="size-3" />
                                      {player.assignedClassLabel}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="destructive"
                                      className="gap-1 text-[10px] font-semibold"
                                    >
                                      <X className="size-3" />
                                      {player.assignedClassLabel} manquant
                                    </Badge>
                                  )}
                                </>
                              )}

                              {/* Discord members not in guild */}
                              {!player.inGuild && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Absent du serveur
                                </Badge>
                              )}

                              {/* Autres rôles indicatifs */}
                              {(() => {
                                const otherRoles = player.discordRoles.filter(
                                  (r) => !r.isWhitelist && !r.isClass
                                );
                                const visibleRoles = otherRoles.slice(0, 3);
                                const hiddenCount = otherRoles.length - visibleRoles.length;

                                return (
                                  <>
                                    {visibleRoles.map((role) => (
                                      <Badge
                                        key={role.id}
                                        variant="secondary"
                                        className="text-muted-foreground h-4 px-1.5 text-[9px] font-normal"
                                      >
                                        {role.name}
                                      </Badge>
                                    ))}
                                    {hiddenCount > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-muted-foreground h-4 cursor-help px-1 text-[9px]"
                                        title={otherRoles
                                          .slice(3)
                                          .map((r) => r.name)
                                          .join(", ")}
                                      >
                                        +{hiddenCount}
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>

                          {/* 5. État */}
                          <td className="px-4 py-3">
                            {player.hasAnomaly ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge
                                  variant="destructive"
                                  className="w-fit text-[10px] font-bold tracking-wider uppercase"
                                >
                                  Anomalie
                                </Badge>
                                <span className="text-destructive line-clamp-1 text-[10px] font-medium">
                                  {player.missingRoles.join(", ")}
                                </span>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                              >
                                Conforme
                              </Badge>
                            )}
                          </td>

                          {/* 6. Action */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant={player.hasAnomaly ? "default" : "outline"}
                              disabled={isSyncing || !player.assignedClass || !player.inGuild}
                              onClick={() => handleResync(player)}
                              className={cn(
                                "h-7 gap-1 px-2.5 text-[11px]",
                                player.hasAnomaly &&
                                  "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              )}
                              title={
                                !player.assignedClass
                                  ? "Définissez d'abord une classe RP sur sa fiche"
                                  : !player.inGuild
                                    ? "Le membre n'a pas été trouvé sur le serveur Discord"
                                    : "Relancer l'attribution des rôles Whitelist et Classe via HyoriBot"
                              }
                            >
                              {isSyncing ? (
                                <>
                                  <CircleNotch className="size-3 animate-spin" />
                                  Synchro...
                                </>
                              ) : (
                                <>
                                  <ArrowClockwise className="size-3" />
                                  {player.hasAnomaly ? "Attribuer rôles" : "Resynchroniser"}
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

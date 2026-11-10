"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChatCircle,
  DiscordLogo,
  ShieldCheck,
  Ticket,
  UserCheck,
  CalendarCheck,
  ArrowSquareOut,
  PaperPlaneTilt,
  ArrowsClockwise,
  CheckCircle,
} from "@phosphor-icons/react";

import { DEFAULT_DISCORD_TEMPLATES } from "@/lib/discord-template-constants";
import {
  saveDiscordTemplatesAction,
  broadcastVillageInvitesAction,
  type DiscordTemplateInput,
} from "@/lib/actions/settings-actions";
import type { BroadcastVillageInvitesSummary } from "@/lib/services/discord-bot-service";
import { VILLAGE_DISCORD_CONFIGS } from "@/lib/character-classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface DiscordTemplateData {
  id: string;
  enabled: boolean;
  channelId?: string | null;
  roleId?: string | null;
}

interface DiscordSettingsTabProps {
  initialTemplates?: DiscordTemplateData[];
}

const CATEGORIES = [
  {
    key: "channel",
    label: "Salon d'alerte externe (Staff)",
    icon: Bell,
    description: "Notifications envoyées dans un salon Discord (serveur staff ou externe)",
  },
  {
    key: "ticket",
    label: "Tickets (MP Joueur)",
    icon: Ticket,
    description: "Notifications envoyées en message privé lors de l'activité sur les tickets",
  },
  {
    key: "registration",
    label: "Inscription & Whitelist (MP Joueur)",
    icon: UserCheck,
    description: "Notifications du statut d'inscription envoyées en message privé",
  },
  {
    key: "character_sheet",
    label: "Fiche Personnage (MP Joueur)",
    icon: ShieldCheck,
    description: "Notifications lors de la validation ou des retours sur la fiche",
  },
  {
    key: "interview",
    label: "Entretien Vocal (MP Joueur)",
    icon: CalendarCheck,
    description: "Relances pour la réservation des créneaux d'entretien",
  },
  {
    key: "rp_tracking",
    label: "Suivi RP (MP Joueur)",
    icon: ChatCircle,
    description:
      "Notifications envoyées en message privé lors d'un nouveau message staff sur le suivi RP",
  },
] as const;

export function DiscordSettingsTab({ initialTemplates = [] }: DiscordSettingsTabProps) {
  // Construire la map d'état initial
  const initialMap: Record<string, DiscordTemplateInput> = {};
  for (const key of Object.keys(DEFAULT_DISCORD_TEMPLATES)) {
    const existing = initialTemplates.find((t) => t.id === key);
    initialMap[key] = {
      id: key,
      enabled: existing ? existing.enabled : true,
      channelId: existing?.channelId ?? "",
      roleId: existing?.roleId ?? "",
    };
  }

  const [templates, setTemplates] = useState<Record<string, DiscordTemplateInput>>(initialMap);
  const [activeCategory, setActiveCategory] = useState<string>("channel");
  const [isPending, startTransition] = useTransition();

  // État pour la diffusion des invitations de village
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lastBroadcastSummary, setLastBroadcastSummary] =
    useState<BroadcastVillageInvitesSummary | null>(null);

  const handleBroadcastInvites = async () => {
    setIsConfirmOpen(false);
    setIsBroadcasting(true);
    toast.info("Analyse des rôles et diffusion des invitations en cours...");
    try {
      const res = await broadcastVillageInvitesAction();
      if (res.success && res.summary) {
        setLastBroadcastSummary(res.summary);
        toast.success(
          `Diffusion terminée : ${res.summary.sent} invitation(s) envoyée(s) avec succès (${res.summary.totalWhitelisted} joueurs whitelistés).`
        );
      } else {
        toast.error(res.error || "Échec de l'envoi des invitations.");
      }
    } catch {
      toast.error("Erreur inattendue lors de la diffusion des invitations.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleFieldChange = (
    templateId: string,
    field: keyof DiscordTemplateInput,
    value: string | boolean
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = Object.values(templates);
        const res = await saveDiscordTemplatesAction(payload);
        if (res.success) {
          toast.success("Configuration des notifications Discord enregistrée avec succès.");
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement de la configuration.");
        }
      } catch {
        toast.error("Erreur inattendue lors de la sauvegarde.");
      }
    });
  };

  // Filtrer les templates selon la catégorie active
  const templatesToDisplay = Object.values(DEFAULT_DISCORD_TEMPLATES).filter((tmpl) => {
    if (activeCategory === "channel") return tmpl.isChannelNotification;
    if (activeCategory === "ticket")
      return tmpl.category === "ticket" && !tmpl.isChannelNotification;
    if (activeCategory === "registration")
      return tmpl.category === "registration" && !tmpl.isChannelNotification;
    return tmpl.category === activeCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Bannière de présentation */}
      <Card className="border-border/60 from-card via-card bg-gradient-to-r to-amber-950/10">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                <DiscordLogo weight="fill" className="size-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold">Notifications Discord</span>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  Active ou désactive les notifications automatiques et configure les salons
                  externes. Les messages sont directement formatés et envoyés selon les standards
                  intégrés de HyoriBot.
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="shrink-0 self-end sm:self-center"
            >
              <Check className="mr-1.5 size-4" />
              <span>{isPending ? "Enregistrement..." : "Enregistrer la configuration"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diffusion des liens Discord de village */}
      <Card className="border-border/60 from-card via-card overflow-hidden bg-gradient-to-r to-emerald-950/10">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <PaperPlaneTilt weight="fill" className="size-6" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">
                      Invitation des joueurs aux serveurs de village
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400"
                    >
                      HyoriBot Direct
                    </Badge>
                  </div>
                  <span className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    Analyse automatiquement les rôles sur le serveur communautaire{" "}
                    <strong>Hyori RP</strong> et envoie en un clic un message privé à chaque joueur
                    whitelisté contenant le lien d&apos;invitation permanent vers le Discord de sa
                    classe-village.
                  </span>
                </div>
              </div>

              <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      disabled={isBroadcasting}
                      className="shrink-0 cursor-pointer self-end bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 sm:self-center"
                    />
                  }
                >
                  {isBroadcasting ? (
                    <>
                      <ArrowsClockwise className="mr-1.5 size-4 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt weight="bold" className="mr-1.5 size-4" />
                      <span>Envoyer les invitations aux whitelistés</span>
                    </>
                  )}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <PaperPlaneTilt className="size-5 text-emerald-500" />
                      <span>Confirmer l&apos;envoi groupé des invitations</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground space-y-2 text-xs leading-relaxed">
                      <span>
                        Le bot Discord va parcourir l&apos;ensemble des membres du serveur
                        communautaire <strong>Hyori RP</strong>, identifier tous les joueurs
                        disposant du rôle <strong>Whitelist</strong> et leur envoyer un message
                        privé avec le lien permanent du serveur Discord de leur classe.
                      </span>
                      <span className="text-foreground block pt-1 font-medium">
                        Es-tu sûr de vouloir lancer la diffusion maintenant ?
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isBroadcasting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBroadcastInvites}
                      disabled={isBroadcasting}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isBroadcasting ? "Envoi en cours..." : "Confirmer l'envoi"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Aperçu des 5 villages et liens permanents */}
            <div className="border-border/40 grid grid-cols-1 gap-2 border-t pt-2 sm:grid-cols-2 lg:grid-cols-5">
              {Object.values(VILLAGE_DISCORD_CONFIGS).map((v) => (
                <div
                  key={v.key}
                  className="border-border/50 bg-background/60 flex flex-col gap-1 rounded-md border p-2.5 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">{v.name}</span>
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                      {v.className}
                    </span>
                  </div>
                  <a
                    href={v.inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground inline-flex items-center gap-1 truncate font-mono text-[10px] transition-colors hover:text-emerald-500"
                    title={v.inviteUrl}
                  >
                    <span className="truncate">{v.inviteUrl}</span>
                    <ArrowSquareOut className="size-3 shrink-0" />
                  </a>
                </div>
              ))}
            </div>

            {/* Résumé de la dernière diffusion si disponible */}
            {lastBroadcastSummary && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle weight="fill" className="size-4 shrink-0 text-emerald-500" />
                <span>
                  Dernier envoi : <strong>{lastBroadcastSummary.sent}</strong> invitation(s)
                  envoyée(s) sur <strong>{lastBroadcastSummary.totalWhitelisted}</strong> joueurs
                  whitelistés.
                </span>
                {lastBroadcastSummary.dmClosed > 0 && (
                  <span className="text-muted-foreground text-[11px]">
                    ({lastBroadcastSummary.dmClosed} MP fermés)
                  </span>
                )}
                {lastBroadcastSummary.noClassRole > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    ({lastBroadcastSummary.noClassRole} sans rôle de classe)
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation par catégories */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                isActive
                  ? "border-primary bg-primary/5 text-primary shadow-xs"
                  : "border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")}
                />
                <span className="text-xs font-semibold">{cat.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Liste des templates pour la catégorie */}
      <div className="flex flex-col gap-4">
        {templatesToDisplay.map((tmpl) => {
          const current = templates[tmpl.id] || {
            id: tmpl.id,
            enabled: true,
            channelId: "",
            roleId: "",
          };

          return (
            <Card key={tmpl.id} className="border-border/60 overflow-hidden">
              <CardHeader className="bg-muted/20 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-semibold">{tmpl.label}</CardTitle>
                    <p className="text-muted-foreground text-xs">{tmpl.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{current.enabled ? "Actif" : "Désactivé"}</span>
                      <Switch
                        checked={current.enabled}
                        onCheckedChange={(val) => handleFieldChange(tmpl.id, "enabled", val)}
                      />
                    </label>
                  </div>
                </div>
              </CardHeader>

              {tmpl.isChannelNotification && (
                <CardContent className="bg-muted/10 border-t p-4">
                  <div className="flex flex-col gap-3">
                    <div className="text-foreground flex items-center gap-2 text-xs font-medium">
                      <Bell className="text-primary size-4" />
                      <span>Salon Discord cible &amp; Mention rôle</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground text-xs font-medium">
                          ID du salon externe
                        </label>
                        <input
                          type="text"
                          value={current.channelId || ""}
                          onChange={(e) => handleFieldChange(tmpl.id, "channelId", e.target.value)}
                          placeholder="ex: 123456789012345678"
                          className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                        />
                        <span className="text-muted-foreground text-[10px]">
                          Laisse vide pour utiliser la variable d&apos;environnement configurée sur
                          le bot.
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground text-xs font-medium">
                          ID du rôle à mentionner (optionnel)
                        </label>
                        <input
                          type="text"
                          value={current.roleId || ""}
                          onChange={(e) => handleFieldChange(tmpl.id, "roleId", e.target.value)}
                          placeholder="ex: 987654321098765432"
                          className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                        />
                        <span className="text-muted-foreground text-[10px]">
                          Le rôle sera mentionné en tête de message (&lt;@&amp;ID&gt;).
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

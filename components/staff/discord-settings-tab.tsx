"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChatCircleText,
  Check,
  DiscordLogo,
  ArrowCounterClockwise,
  PencilSimple,
  ShieldCheck,
  Ticket,
  UserCheck,
  CalendarCheck,
  ArrowSquareOut,
  Info,
} from "@phosphor-icons/react";

import {
  DEFAULT_DISCORD_TEMPLATES,
  type DefaultTemplateConfig,
  type DiscordTemplateId,
} from "@/lib/discord-template-constants";
import {
  saveDiscordTemplatesAction,
  type DiscordTemplateInput,
} from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface DiscordTemplateData {
  id: string;
  enabled: boolean;
  channelId?: string | null;
  roleId?: string | null;
  title?: string | null;
  description?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
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
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      buttonLabel: existing?.buttonLabel ?? "",
      buttonUrl: existing?.buttonUrl ?? "",
    };
  }

  const [templates, setTemplates] = useState<Record<string, DiscordTemplateInput>>(initialMap);
  const [activeCategory, setActiveCategory] = useState<string>("channel");
  const [isPending, startTransition] = useTransition();

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

  const handleResetToDefault = (templateId: DiscordTemplateId) => {
    setTemplates((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        title: "",
        description: "",
        buttonLabel: "",
        buttonUrl: "",
      },
    }));
    toast.info("Champs réinitialisés : le format par défaut du bot sera utilisé.");
  };

  const handlePrefillWithDefault = (templateId: DiscordTemplateId) => {
    const def = DEFAULT_DISCORD_TEMPLATES[templateId];
    if (!def) return;
    setTemplates((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        title: def.defaultTitle,
        description: def.defaultDescription,
        buttonLabel: def.defaultButtonLabel,
        buttonUrl: "",
      },
    }));
    toast.success("Modèle prérempli avec la structure par défaut.");
  };

  const handleInsertVariable = (templateId: string, variableKey: string) => {
    const currentDesc = templates[templateId]?.description || "";
    handleFieldChange(templateId, "description", currentDesc + " " + variableKey);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = Object.values(templates);
        const res = await saveDiscordTemplatesAction(payload);
        if (res.success) {
          toast.success("Modèles de notifications Discord enregistrés avec succès.");
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement des modèles.");
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
                <span className="text-base font-semibold">
                  Personnalisation des messages Discord
                </span>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  Configurez le salon externe d&apos;alerte staff et personnalisez le contenu des
                  embeds envoyés aux joueurs. Par défaut, le bot utilise ses structures intégrées.
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
      <div className="flex flex-col gap-6">
        {templatesToDisplay.map((tmpl) => {
          const current = templates[tmpl.id] || {
            id: tmpl.id,
            enabled: true,
            channelId: "",
            roleId: "",
            title: "",
            description: "",
            buttonLabel: "",
            buttonUrl: "",
          };

          const isCustomized = Boolean(
            current.title?.trim() ||
            current.description?.trim() ||
            current.buttonLabel?.trim() ||
            current.buttonUrl?.trim()
          );

          return (
            <Card key={tmpl.id} className="border-border/60 overflow-hidden">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold">{tmpl.label}</CardTitle>
                    {isCustomized ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Personnalisé
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        Par défaut (bot)
                      </span>
                    )}
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

              <CardContent className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
                {/* Formulaire de configuration (colonne gauche) */}
                <div className="flex flex-col gap-4 lg:col-span-7">
                  {/* Configuration spécifique au salon externe pour TICKET_CREATED */}
                  {tmpl.isChannelNotification && (
                    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
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
                            onChange={(e) =>
                              handleFieldChange(tmpl.id, "channelId", e.target.value)
                            }
                            placeholder="ex: 123456789012345678"
                            className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                          />
                          <span className="text-muted-foreground text-[10px]">
                            Laissez vide pour utiliser la variable d&apos;environnement du bot.
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
                            Le rôle sera mentionné en préfixe (&lt;@&amp;ID&gt;).
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action pour préremplir / réinitialiser */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Champs de l&apos;embed</span>
                    <div className="flex items-center gap-2">
                      {!isCustomized && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrefillWithDefault(tmpl.id)}
                          className="h-7 text-xs"
                        >
                          <PencilSimple className="mr-1 size-3.5" />
                          <span>Préremplir pour modifier</span>
                        </Button>
                      )}
                      {isCustomized && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetToDefault(tmpl.id)}
                          className="text-muted-foreground hover:text-foreground h-7 text-xs"
                        >
                          <ArrowCounterClockwise className="mr-1 size-3.5" />
                          <span>Rétablir par défaut</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Titre de l'embed */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-xs font-medium">
                      Titre de l&apos;embed
                    </label>
                    <input
                      type="text"
                      value={current.title || ""}
                      onChange={(e) => handleFieldChange(tmpl.id, "title", e.target.value)}
                      placeholder={tmpl.defaultTitle}
                      className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                    />
                  </div>

                  {/* Description de l'embed */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-xs font-medium">
                      Description du message
                    </label>
                    <textarea
                      rows={5}
                      value={current.description || ""}
                      onChange={(e) => handleFieldChange(tmpl.id, "description", e.target.value)}
                      placeholder={tmpl.defaultDescription}
                      className="border-input bg-background focus:ring-ring rounded-md border p-3 font-mono text-xs focus:ring-2 focus:outline-none"
                    />
                  </div>

                  {/* Variables disponibles */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-[11px] font-medium">
                      Variables dynamiques disponibles (cliquez pour insérer) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tmpl.availableVariables.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertVariable(tmpl.id, v.key)}
                          title={v.description}
                          className="border-border hover:border-primary/50 hover:bg-primary/5 bg-card text-foreground rounded border px-2 py-0.5 font-mono text-[11px] transition-colors"
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bouton d'action */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-muted-foreground text-xs font-medium">
                        Libellé du bouton
                      </label>
                      <input
                        type="text"
                        value={current.buttonLabel || ""}
                        onChange={(e) => handleFieldChange(tmpl.id, "buttonLabel", e.target.value)}
                        placeholder={tmpl.defaultButtonLabel}
                        className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-muted-foreground text-xs font-medium">
                        URL personnalisée (optionnel)
                      </label>
                      <input
                        type="text"
                        value={current.buttonUrl || ""}
                        onChange={(e) => handleFieldChange(tmpl.id, "buttonUrl", e.target.value)}
                        placeholder="Lien généré automatiquement par défaut"
                        className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 text-xs focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Prévisualisation Discord (colonne droite) */}
                <div className="flex flex-col gap-2 lg:col-span-5">
                  <span className="text-muted-foreground text-xs font-medium">
                    Aperçu Discord en direct :
                  </span>
                  <div className="flex flex-col gap-2 rounded-lg border border-[#1e1f22] bg-[#2b2d31] p-4 text-[#dbdee1] shadow-inner">
                    {/* Bot header */}
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
                        H
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">HyoriBot</span>
                        <span className="py-0.2 rounded bg-[#5865F2] px-1 text-[9px] font-bold text-white uppercase">
                          BOT
                        </span>
                      </div>
                      <span className="text-[10px] text-[#949ba4]">Aujourd&apos;hui à 14:02</span>
                    </div>

                    {/* Mention rôle si configurée */}
                    {tmpl.isChannelNotification && current.roleId?.trim() && (
                      <div className="inline-block rounded bg-[#5865F2]/20 px-1 py-0.5 font-mono text-[11px] text-[#c9cdfb]">
                        @{current.roleId.trim()}
                      </div>
                    )}

                    {/* Embed container */}
                    <div className="flex rounded border-l-4 border-amber-500 bg-[#232428] p-3 text-xs">
                      <div className="flex flex-col gap-2">
                        {/* Title */}
                        <div className="font-semibold text-white">
                          {current.title?.trim() || tmpl.defaultTitle}
                        </div>

                        {/* Description */}
                        <div className="text-xs leading-relaxed whitespace-pre-wrap text-[#dbdee1]">
                          {current.description?.trim() || tmpl.defaultDescription}
                        </div>
                      </div>
                    </div>

                    {/* Bouton Discord */}
                    <div className="mt-1 flex items-center">
                      <div className="flex cursor-default items-center gap-1.5 rounded bg-[#4e5058] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">
                        <span>{current.buttonLabel?.trim() || tmpl.defaultButtonLabel}</span>
                        <ArrowSquareOut className="size-3.5 opacity-80" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DiscordLogo, Check, Scroll, Wrench, UserCheck, Bell } from "@phosphor-icons/react";

import {
  DEFAULT_DISCORD_TEMPLATES,
  type DiscordTemplateId,
} from "@/lib/discord-template-constants";
import {
  saveDiscordTemplatesAction,
  type DiscordTemplateInput,
} from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export interface DiscordTemplateData {
  id: string;
  enabled: boolean;
  channelId?: string | null;
  roleId?: string | null;
}

interface DiscordSettingsTabProps {
  initialTemplates?: DiscordTemplateData[];
}

const TEMPLATE_ICONS: Record<DiscordTemplateId, React.ElementType> = {
  TICKET_RP_CREATED: Scroll,
  TICKET_TECH_CREATED: Wrench,
  WAITLIST_REGISTRATION: UserCheck,
};

export function DiscordSettingsTab({ initialTemplates = [] }: DiscordSettingsTabProps) {
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

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = Object.values(templates);
        const res = await saveDiscordTemplatesAction(payload);
        if (res.success) {
          toast.success("Paramètres des notifications Discord staff enregistrés avec succès.");
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement de la configuration.");
        }
      } catch {
        toast.error("Erreur inattendue lors de la sauvegarde.");
      }
    });
  };

  const templateList = Object.values(DEFAULT_DISCORD_TEMPLATES);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête de section */}
      <Card className="border-border/60 from-card via-card bg-gradient-to-r to-indigo-950/10">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                <DiscordLogo weight="fill" className="size-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">Notifications Discord (Staff)</span>
                  <Badge variant="outline" className="text-[11px]">
                    Alertes Staff
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  Configurez les salons de destination et les rôles notifiés pour chaque alerte
                  transmise à l&apos;équipe staff.
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

      {/* Liste des notifications staff */}
      <div className="grid grid-cols-1 gap-4">
        {templateList.map((tmpl) => {
          const current = templates[tmpl.id] || {
            id: tmpl.id,
            enabled: true,
            channelId: "",
            roleId: "",
          };
          const Icon = TEMPLATE_ICONS[tmpl.id] || Bell;

          return (
            <Card key={tmpl.id} className="border-border/60 overflow-hidden">
              <CardHeader className="bg-muted/20 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold">{tmpl.label}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {tmpl.id}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">{tmpl.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      {current.enabled ? "Active" : "Désactivée"}
                    </span>
                    <Switch
                      checked={current.enabled}
                      onCheckedChange={(val) => handleFieldChange(tmpl.id, "enabled", val)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="bg-card/40 border-t p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-xs font-medium">
                      ID du salon Discord cible
                    </label>
                    <input
                      type="text"
                      value={current.channelId || ""}
                      onChange={(e) => handleFieldChange(tmpl.id, "channelId", e.target.value)}
                      placeholder="ex: 123456789012345678"
                      disabled={!current.enabled}
                      className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-50"
                    />
                    <span className="text-muted-foreground text-[10px]">
                      Laissez vide pour utiliser le salon par défaut du bot.
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
                      disabled={!current.enabled}
                      className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-50"
                    />
                    <span className="text-muted-foreground text-[10px]">
                      Mentionné en préfixe de message (&lt;@&amp;ID&gt;).
                    </span>
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

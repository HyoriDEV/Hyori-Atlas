"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DiscordLogo,
  Check,
  Scroll,
  Wrench,
  UserCheck,
  IdentificationCard,
  CalendarBlank,
  ChatsCircle,
  UsersThree,
} from "@phosphor-icons/react";

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
  CHARACTER_SHEET_SUBMITTED: IdentificationCard,
  INTERVIEW_SLOT_BOOKED: CalendarBlank,
};

const ADMISSION_TEMPLATE_IDS: DiscordTemplateId[] = [
  "WAITLIST_REGISTRATION",
  "CHARACTER_SHEET_SUBMITTED",
  "INTERVIEW_SLOT_BOOKED",
];

const TICKET_TEMPLATE_IDS: DiscordTemplateId[] = ["TICKET_RP_CREATED", "TICKET_TECH_CREATED"];

export function DiscordSettingsTab({ initialTemplates = [] }: DiscordSettingsTabProps) {
  // Déterminer l'ID du salon unique #admissions à partir des templates existants
  const findInitialAdmissionsChannel = () => {
    for (const id of ADMISSION_TEMPLATE_IDS) {
      const match = initialTemplates.find((t) => t.id === id);
      if (match?.channelId?.trim()) {
        return match.channelId.trim();
      }
    }
    return "";
  };

  const initialAdmissionsChannel = findInitialAdmissionsChannel();

  const initialMap: Record<string, DiscordTemplateInput> = {};
  for (const key of Object.keys(DEFAULT_DISCORD_TEMPLATES)) {
    const existing = initialTemplates.find((t) => t.id === key);
    const isAdmission = ADMISSION_TEMPLATE_IDS.includes(key as DiscordTemplateId);
    initialMap[key] = {
      id: key,
      enabled: existing ? existing.enabled : true,
      channelId: isAdmission ? initialAdmissionsChannel : (existing?.channelId?.trim() ?? ""),
      roleId: existing?.roleId?.trim() ?? "",
    };
  }

  const [templates, setTemplates] = useState<Record<string, DiscordTemplateInput>>(initialMap);
  const [admissionsChannelId, setAdmissionsChannelId] = useState<string>(initialAdmissionsChannel);
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

  const handleAdmissionsChannelChange = (newChannelId: string) => {
    setAdmissionsChannelId(newChannelId);
    setTemplates((prev) => {
      const updated = { ...prev };
      for (const id of ADMISSION_TEMPLATE_IDS) {
        if (updated[id]) {
          updated[id] = {
            ...updated[id],
            channelId: newChannelId,
          };
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = Object.values(templates).map((t) => {
          if (ADMISSION_TEMPLATE_IDS.includes(t.id as DiscordTemplateId)) {
            return {
              ...t,
              channelId: admissionsChannelId.trim() || null,
            };
          }
          return t;
        });

        const res = await saveDiscordTemplatesAction(payload);
        if (res.success) {
          toast.success("Paramètres des salons et alertes Discord enregistrés avec succès.");
        } else {
          toast.error(res.error || "Erreur lors de l'enregistrement de la configuration.");
        }
      } catch {
        toast.error("Erreur inattendue lors de la sauvegarde.");
      }
    });
  };

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
                  <span className="text-base font-semibold">
                    Salons & Notifications Discord Staff
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    Alertes Staff
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  Configurez les salons Discord et les rôles notifiés pour les tickets support et
                  l&apos;ensemble du processus d&apos;admission. Ces identifiants sont gérés ici et
                  non dans le code du bot.
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

      {/* SECTION 1 : SALONS DE SUPPORT (TICKETS RP & TECHNIQUE) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <ChatsCircle className="text-primary size-5" />
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold">Support & Assistance (Tickets)</h2>
            <p className="text-muted-foreground text-xs">
              Les tickets sont notifiés dans deux salons textuels distincts selon leur nature (RP ou
              Technique).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {TICKET_TEMPLATE_IDS.map((tmplId) => {
            const tmpl = DEFAULT_DISCORD_TEMPLATES[tmplId];
            const current = templates[tmplId] || {
              id: tmplId,
              enabled: true,
              channelId: "",
              roleId: "",
            };
            const Icon = TEMPLATE_ICONS[tmplId] || Scroll;

            return (
              <Card key={tmplId} className="border-border/60 overflow-hidden">
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
                            {tmpl.channelDefaultName || tmpl.id}
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
                        onCheckedChange={(val) => handleFieldChange(tmplId, "enabled", val)}
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
                        onChange={(e) => handleFieldChange(tmplId, "channelId", e.target.value)}
                        placeholder="ex: 1552506859670347776"
                        disabled={!current.enabled}
                        className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-50"
                      />
                      <span className="text-muted-foreground text-[10px]">
                        ID du salon textuel dédié aux tickets de cette catégorie.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-muted-foreground text-xs font-medium">
                        ID du rôle à mentionner (optionnel)
                      </label>
                      <input
                        type="text"
                        value={current.roleId || ""}
                        onChange={(e) => handleFieldChange(tmplId, "roleId", e.target.value)}
                        placeholder="ex: 1539770126314901635"
                        disabled={!current.enabled}
                        className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-50"
                      />
                      <span className="text-muted-foreground text-[10px]">
                        Rôle mentionné lors de la création d&apos;un ticket.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 : SALON UNIQUE DES ADMISSIONS (#ADMISSIONS) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <UsersThree className="text-primary size-5" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Admissions & Recrutement</h2>
              <Badge variant="secondary" className="font-mono text-[10px]">
                #admissions
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Salon unique regroupant les 3 étapes d&apos;admission : liste d&apos;attente, fiches
              RP soumises et réservations d&apos;entretien.
            </p>
          </div>
        </div>

        <Card className="border-border/60 overflow-hidden">
          {/* Configuration du salon commun #admissions */}
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Salon textuel unique (#admissions)</span>
                  <Badge variant="outline" className="text-[10px]">
                    Centralisé
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Renseignez ici l&apos;identifiant Discord du salon <strong>#admissions</strong>.
                  Les 3 alertes ci-dessous seront automatiquement transmises dans ce même salon.
                </p>
              </div>

              <div className="flex w-full flex-col gap-1 sm:w-72">
                <label className="text-muted-foreground text-xs font-medium">
                  ID du salon #admissions
                </label>
                <input
                  type="text"
                  value={admissionsChannelId}
                  onChange={(e) => handleAdmissionsChannelChange(e.target.value)}
                  placeholder="ex: 1557096333683331172"
                  className="border-input bg-background focus:ring-ring h-9 rounded-md border px-3 font-mono text-xs focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </CardHeader>

          {/* Liste des 3 alertes du processus d'admissions */}
          <CardContent className="divide-border/60 bg-card/20 divide-y p-0">
            {ADMISSION_TEMPLATE_IDS.map((tmplId) => {
              const tmpl = DEFAULT_DISCORD_TEMPLATES[tmplId];
              const current = templates[tmplId] || {
                id: tmplId,
                enabled: true,
                channelId: admissionsChannelId,
                roleId: "",
              };
              const Icon = TEMPLATE_ICONS[tmplId] || UserCheck;

              return (
                <div
                  key={tmplId}
                  className="hover:bg-muted/10 flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tmpl.label}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {tmpl.id}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">{tmpl.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:shrink-0">
                    <div className="flex flex-col gap-1">
                      <label className="text-muted-foreground text-[11px] font-medium">
                        Rôle à mentionner (optionnel)
                      </label>
                      <input
                        type="text"
                        value={current.roleId || ""}
                        onChange={(e) => handleFieldChange(tmplId, "roleId", e.target.value)}
                        placeholder="ex: 1539770188671483935"
                        disabled={!current.enabled}
                        className="border-input bg-background focus:ring-ring h-8 w-44 rounded-md border px-2.5 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-3 sm:pt-0">
                      <span className="text-muted-foreground text-xs font-medium">
                        {current.enabled ? "Active" : "Désactivée"}
                      </span>
                      <Switch
                        checked={current.enabled}
                        onCheckedChange={(val) => handleFieldChange(tmplId, "enabled", val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

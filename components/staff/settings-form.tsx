"use client";

import { useActionState, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Check, UploadSimple, Link as LinkIcon, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { saveGlobalSettingsAction } from "@/lib/actions/settings-actions";
import { uploadCountdownVideoAction } from "@/lib/actions/countdown-video-actions";
import { GlobalSettings } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  defaultValues: GlobalSettings & {
    updatedBy?: {
      minecraftUsername: string | null;
      discordDisplayName: string | null;
      discordUsername: string | null;
    } | null;
    countdownEnabled?: boolean;
    countdownBadgeText?: string | null;
    countdownTitle?: string;
    countdownSubtitle?: string | null;
    countdownTargetDate?: Date | null;
    countdownVideoType?: string;
    countdownVideoUrl?: string | null;
    countdownDiscordUrl?: string | null;
    publicNewsEnabled?: boolean;
    publicRulesEnabled?: boolean;
    publicLoreEnabled?: boolean;
    publicGalleryEnabled?: boolean;
  };
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const { initialDate, initialTime } = useMemo(() => {
    if (!defaultValues.countdownTargetDate) return { initialDate: "", initialTime: "18:00" };
    try {
      const d = new Date(defaultValues.countdownTargetDate);
      if (isNaN(d.getTime())) return { initialDate: "", initialTime: "18:00" };
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        initialDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        initialTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      };
    } catch {
      return { initialDate: "", initialTime: "18:00" };
    }
  }, [defaultValues.countdownTargetDate]);

  const [countdownEnabled, setCountdownEnabled] = useState(defaultValues.countdownEnabled ?? false);
  const [datePart, setDatePart] = useState(initialDate);
  const [timePart, setTimePart] = useState(initialTime);
  const [videoType, setVideoType] = useState(defaultValues.countdownVideoType || "URL");
  const [videoUrl, setVideoUrl] = useState(defaultValues.countdownVideoUrl || "");
  const [isUploadingVideo, startUploadTransition] = useTransition();

  const combinedTargetDate = useMemo(() => {
    if (!datePart) return "";
    return `${datePart}T${timePart || "00:00"}`;
  }, [datePart, timePart]);

  const setPreset = (type: "tonight" | "tomorrow" | "weekend" | "in3days" | "in1week") => {
    const now = new Date();
    const target = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    if (type === "tonight") {
      target.setHours(20, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
    } else if (type === "tomorrow") {
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (type === "weekend") {
      const day = now.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      target.setDate(now.getDate() + diff);
      target.setHours(18, 0, 0, 0);
    } else if (type === "in3days") {
      target.setDate(target.getDate() + 3);
      target.setHours(18, 0, 0, 0);
    } else if (type === "in1week") {
      target.setDate(target.getDate() + 7);
      target.setHours(18, 0, 0, 0);
    }

    setDatePart(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`);
    setTimePart(`${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const clearDate = () => {
    setDatePart("");
    setTimePart("18:00");
  };

  const [, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      try {
        const result = await saveGlobalSettingsAction(formData);
        if (result.success) {
          toast.success("Paramètres enregistrés avec succès.");
        }
        return result;
      } catch {
        toast.error("Erreur lors de l'enregistrement des paramètres.");
        return { success: false };
      }
    },
    null
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("La vidéo dépasse 100 Mo.");
      return;
    }

    startUploadTransition(async () => {
      const data = new FormData();
      data.append("videoFile", file);

      toast.info("Téléversement de la vidéo...");
      const res = await uploadCountdownVideoAction(data);

      if (res.success && res.url) {
        setVideoUrl(res.url);
        setVideoType("FILE");
        toast.success("Vidéo téléversée avec succès.");
      } else {
        toast.error(res.error || "Échec du téléversement.");
      }
    });
  };

  const lastUpdatedFormatted = useMemo(() => {
    if (!defaultValues.updatedAt) return null;
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(defaultValues.updatedAt));
    } catch {
      return null;
    }
  }, [defaultValues.updatedAt]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Tabs defaultValue="modules" className="w-full gap-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="public">Pages publiques</TabsTrigger>
          <TabsTrigger value="countdown">Accueil &amp; Compte à rebours</TabsTrigger>
          <TabsTrigger value="minecraft">Minecraft</TabsTrigger>
        </TabsList>

        {/* 1. MODULES */}
        <TabsContent value="modules" keepMounted={true}>
          <div className="divide-y rounded-lg border bg-card">
            <SettingRow
              name="registrationEnabled"
              label="Inscriptions (via Discord)"
              defaultChecked={defaultValues.registrationEnabled}
            />
            <SettingRow
              name="interviewBookingEnabled"
              label="Réservation d'entretiens Whitelist"
              defaultChecked={defaultValues.interviewBookingEnabled}
            />
            <SettingRow
              name="ticketCreationEnabled"
              label="Ouverture de tickets"
              defaultChecked={defaultValues.ticketCreationEnabled}
            />
            <SettingRow
              name="rpTrackingAccessEnabled"
              label="Accès au Suivi RP"
              defaultChecked={defaultValues.rpTrackingAccessEnabled}
            />
            <SettingRow
              name="chapterWritingEnabled"
              label="Écriture de narration (Chapitres)"
              defaultChecked={defaultValues.chapterWritingEnabled}
            />
            <SettingRow
              name="bdaReportSubmissionEnabled"
              label="Soumission de rapports BDA"
              defaultChecked={defaultValues.bdaReportSubmissionEnabled}
            />
          </div>
        </TabsContent>

        {/* 2. PAGES PUBLIQUES */}
        <TabsContent value="public" keepMounted={true}>
          <div className="divide-y rounded-lg border bg-card">
            <SettingRow
              name="publicNewsEnabled"
              label="Page Actualités (/news)"
              defaultChecked={defaultValues.publicNewsEnabled ?? true}
            />
            <SettingRow
              name="publicRulesEnabled"
              label="Page Règlement (/rules)"
              defaultChecked={defaultValues.publicRulesEnabled ?? true}
            />
            <SettingRow
              name="publicLoreEnabled"
              label="Page Univers & Lore (/lore)"
              defaultChecked={defaultValues.publicLoreEnabled ?? true}
            />
            <SettingRow
              name="publicGalleryEnabled"
              label="Page Galerie (/gallery)"
              defaultChecked={defaultValues.publicGalleryEnabled ?? true}
            />
          </div>
        </TabsContent>

        {/* 3. ACCUEIL & COMPTE À REBOURS */}
        <TabsContent value="countdown" keepMounted={true} className="flex flex-col gap-6">
          <div className="divide-y rounded-lg border bg-card">
            <div
              onClick={() => setCountdownEnabled(!countdownEnabled)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
            >
              <span className="text-sm font-medium">
                Activer le compte à rebours sur l&apos;accueil
              </span>
              <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                <Switch
                  id="countdownEnabled"
                  name="countdownEnabled"
                  value="true"
                  checked={countdownEnabled}
                  onCheckedChange={setCountdownEnabled}
                />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="countdownBadgeText" className="text-xs font-medium text-muted-foreground">
                    En-tête éditorial
                  </label>
                  <input
                    type="text"
                    id="countdownBadgeText"
                    name="countdownBadgeText"
                    defaultValue={defaultValues.countdownBadgeText || "Hyori RP — Lancement Officiel"}
                    placeholder="Hyori RP — Lancement Officiel"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="countdownTitle" className="text-xs font-medium text-muted-foreground">
                    Titre principal
                  </label>
                  <input
                    type="text"
                    id="countdownTitle"
                    name="countdownTitle"
                    defaultValue={defaultValues.countdownTitle || "Lancement Officiel de Hyori RP"}
                    placeholder="Lancement Officiel de Hyori RP"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="countdownSubtitle" className="text-xs font-medium text-muted-foreground">
                    Sous-titre
                  </label>
                  <input
                    type="text"
                    id="countdownSubtitle"
                    name="countdownSubtitle"
                    defaultValue={
                      defaultValues.countdownSubtitle ??
                      "Le compte à rebours est lancé. Préparez-vous à entrer dans l'histoire."
                    }
                    placeholder="Sous-titre"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="countdownDiscordUrl" className="text-xs font-medium text-muted-foreground">
                    Lien d&apos;invitation Discord
                  </label>
                  <input
                    type="url"
                    id="countdownDiscordUrl"
                    name="countdownDiscordUrl"
                    defaultValue={defaultValues.countdownDiscordUrl || "https://discord.gg/hyori"}
                    placeholder="https://discord.gg/hyori"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Heure */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Date &amp; heure d&apos;échéance
                  </span>
                  {datePart && (
                    <button
                      type="button"
                      onClick={clearDate}
                      className="text-muted-foreground hover:text-destructive text-xs transition-colors hover:underline"
                    >
                      Effacer la date
                    </button>
                  )}
                </div>

                <input
                  type="hidden"
                  id="countdownTargetDate"
                  name="countdownTargetDate"
                  value={combinedTargetDate}
                />

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreset("tonight")}
                    className="border-border bg-muted/30 hover:bg-muted text-foreground/80 rounded-md border px-2.5 py-1 text-xs transition-colors"
                  >
                    Ce soir (20h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("tomorrow")}
                    className="border-border bg-muted/30 hover:bg-muted text-foreground/80 rounded-md border px-2.5 py-1 text-xs transition-colors"
                  >
                    Demain (18h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("weekend")}
                    className="border-border bg-muted/30 hover:bg-muted text-foreground/80 rounded-md border px-2.5 py-1 text-xs transition-colors"
                  >
                    Ce samedi (18h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("in3days")}
                    className="border-border bg-muted/30 hover:bg-muted text-foreground/80 rounded-md border px-2.5 py-1 text-xs transition-colors"
                  >
                    +3 jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("in1week")}
                    className="border-border bg-muted/30 hover:bg-muted text-foreground/80 rounded-md border px-2.5 py-1 text-xs transition-colors"
                  >
                    +1 semaine
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={datePart}
                    onChange={(e) => setDatePart(e.target.value)}
                    className="border-input bg-background focus:ring-ring w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={timePart}
                    onChange={(e) => setTimePart(e.target.value)}
                    className="border-input bg-background focus:ring-ring w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Vidéo d'ambiance */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Vidéo d&apos;arrière-plan
                  </span>

                  <div className="bg-muted inline-flex rounded-md border p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setVideoType("URL")}
                      className={cn(
                        "rounded px-2.5 py-0.5 font-medium transition-all",
                        videoType === "URL"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Lien URL / YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoType("FILE")}
                      className={cn(
                        "rounded px-2.5 py-0.5 font-medium transition-all",
                        videoType === "FILE"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Fichier local
                    </button>
                  </div>
                </div>

                <input type="hidden" name="countdownVideoType" value={videoType} />
                <input type="hidden" name="countdownVideoUrl" value={videoUrl} />

                {videoType === "URL" ? (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... ou lien direct .mp4"
                      className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    />
                    {videoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setVideoUrl("")}
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="border-input bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-xs font-medium transition-colors">
                      <UploadSimple className="size-4 text-muted-foreground" />
                      <span>{isUploadingVideo ? "Téléversement..." : "Sélectionner un fichier vidéo"}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleFileUpload}
                        disabled={isUploadingVideo}
                        className="sr-only"
                      />
                    </label>
                    {videoUrl && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-emerald-500" />
                        <span className="max-w-[240px] truncate">{videoUrl}</span>
                        <button
                          type="button"
                          onClick={() => setVideoUrl("")}
                          className="text-destructive hover:underline ml-1"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {videoUrl && (
                  <div className="relative aspect-video max-h-44 w-full overflow-hidden rounded-md border bg-black">
                    {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={
                          videoUrl.includes("youtu.be/")
                            ? `https://www.youtube-nocookie.com/embed/${videoUrl.split("youtu.be/")[1]?.split("?")[0]}?autoplay=0&controls=1`
                            : `https://www.youtube-nocookie.com/embed/${videoUrl.split("v=")[1]?.split("&")[0]}?autoplay=0&controls=1`
                        }
                        title="Prévisualisation"
                        className="h-full w-full border-0"
                      />
                    ) : (
                      <video controls muted className="h-full w-full object-cover">
                        <source src={videoUrl} />
                      </video>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. MINECRAFT */}
        <TabsContent value="minecraft" keepMounted={true}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="minecraftServerAddress" className="text-xs font-medium text-muted-foreground">
                    Adresse du serveur (IP ou domaine)
                  </label>
                  <input
                    type="text"
                    id="minecraftServerAddress"
                    name="minecraftServerAddress"
                    defaultValue={defaultValues.minecraftServerAddress}
                    placeholder="auth.hyori-rp.fr"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="minecraftServerVersion" className="text-xs font-medium text-muted-foreground">
                    Version recommandée
                  </label>
                  <input
                    type="text"
                    id="minecraftServerVersion"
                    name="minecraftServerVersion"
                    defaultValue={defaultValues.minecraftServerVersion}
                    placeholder="1.21.11"
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="minecraftAuthCommand" className="text-xs font-medium text-muted-foreground">
                  Préfixe de commande de liaison en jeu
                </label>
                <div className="flex items-center">
                  <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 font-mono text-sm">
                    /
                  </span>
                  <input
                    type="text"
                    id="minecraftAuthCommand"
                    name="minecraftAuthCommand"
                    defaultValue={defaultValues.minecraftAuthCommand}
                    placeholder="auth"
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-r-md border px-3 py-1.5 font-mono text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BARRE DE SAUVEGARDE ÉPURÉE */}
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-xs text-muted-foreground">
          {lastUpdatedFormatted ? `Dernière sauvegarde : ${lastUpdatedFormatted}` : ""}
        </span>
        <Button type="submit" disabled={isPending || isUploadingVideo}>
          {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}

// Ligne de réglage épurée
function SettingRow({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div
      onClick={() => setChecked(!checked)}
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
    >
      <span className="text-sm font-medium">
        {label}
      </span>
      <div onClick={(e) => e.stopPropagation()} className="flex items-center">
        <Switch
          id={`setting-${name}`}
          name={name}
          value="true"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  Check,
  UploadSimple,
  Link as LinkIcon,
  VideoCamera,
  Trash,
  HourglassHigh,
  CalendarBlank,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";

import { DiscordOfficialIcon } from "@/components/icons/discord-icon";
import { Button } from "@/components/ui/button";
import { saveGlobalSettingsAction } from "@/lib/actions/settings-actions";
import { uploadCountdownVideoAction } from "@/lib/actions/countdown-video-actions";
import { GlobalSettings } from "@/lib/generated/prisma/client";

interface SettingsFormProps {
  defaultValues: GlobalSettings & {
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

function formatTargetDateFrench(dateStr: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  try {
    const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date);
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${month} ${year} à ${hours}h${minutes}`;
  } catch {
    return null;
  }
}

function getRelativeTimeDescription(dateStr: string): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (isNaN(target)) return null;
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return "Événement commencé ou terminé";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}min`);

  return parts.length > 0 ? `dans ${parts.join(" ")}` : "dans moins d'une minute";
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  // Découpage initial de la date ISO pour une saisie ultra-simple
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

  const frenchDatePreview = useMemo(() => {
    return formatTargetDateFrench(combinedTargetDate);
  }, [combinedTargetDate]);

  const relativeTimePreview = useMemo(() => {
    return getRelativeTimeDescription(combinedTargetDate);
  }, [combinedTargetDate]);

  const setPreset = (type: "tonight" | "tomorrow" | "weekend" | "in3days" | "in1week") => {
    const now = new Date();
    const target = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    if (type === "tonight") {
      target.setHours(20, 0, 0, 0);
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
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
        toast.error("Erreur lors de l'enregistrement.");
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

      toast.info("Téléversement de la vidéo en cours...");
      const res = await uploadCountdownVideoAction(data);

      if (res.success && res.url) {
        setVideoUrl(res.url);
        setVideoType("FILE");
        toast.success("Vidéo téléversée et configurée avec succès !");
      } else {
        toast.error(res.error || "Échec du téléversement.");
      }
    });
  };

  return (
    <form action={formAction} className="space-y-8">
      {/* ------------------------------------------------------------- */}
      {/* 1. COMPTE À REBOURS & VIDÉO EN ARRIÈRE-PLAN */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
        <div className="flex items-center gap-2.5 text-amber-500">
          <HourglassHigh className="size-5" weight="bold" />
          <h2 className="text-foreground text-base font-semibold">
            Compte à Rebours &amp; Page d&apos;Accueil Immersive
          </h2>
        </div>
        <p className="text-muted-foreground text-[13px]">
          Configurez un compte à rebours avec vidéo d&apos;ambiance en arrière-plan. La page
          d&apos;accueil deviendra non scrollable avec le compte à rebours au premier plan.
        </p>

        {/* Toggle Activer / Désactiver */}
        <div className="bg-card flex items-center justify-between rounded-lg border p-4 shadow-2xs">
          <div className="space-y-0.5">
            <label htmlFor="countdownEnabled" className="text-sm font-medium">
              Activer le compte à rebours sur l&apos;accueil
            </label>
            <p className="text-muted-foreground text-[13px]">
              Remplace la page d&apos;accueil par le compte à rebours immersif avec vidéo de fond.
            </p>
          </div>
          <div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="countdownEnabled"
                name="countdownEnabled"
                value="true"
                checked={countdownEnabled}
                onChange={(e) => setCountdownEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer border-input bg-muted peer-checked:bg-primary peer-focus:ring-ring dark:peer-focus:ring-primary h-6 w-11 rounded-full border peer-focus:ring-2 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
        </div>

        {/* Paramètres détaillés lorsque le compte à rebours est activé */}
        <div className="space-y-4 pt-2">
          {/* En-tête / Kicker éditorial & Titre principal */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Texte d'en-tête (Kicker entre les filets) */}
            <div className="space-y-1.5">
              <label htmlFor="countdownBadgeText" className="text-sm font-medium">
                Texte d&apos;en-tête (entre les deux filets)
              </label>
              <input
                type="text"
                id="countdownBadgeText"
                name="countdownBadgeText"
                defaultValue={defaultValues.countdownBadgeText || "Hyori RP — Lancement Officiel"}
                placeholder="Hyori RP — Lancement Officiel"
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <p className="text-muted-foreground text-[12px]">
                Affiché en majuscules entre les deux filets dorés (ex : HYORI RP — LANCEMENT
                OFFICIEL).
              </p>
            </div>

            {/* Titre */}
            <div className="space-y-1.5">
              <label htmlFor="countdownTitle" className="text-sm font-medium">
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
            {/* Sous-titre */}
            <div className="space-y-1.5">
              <label htmlFor="countdownSubtitle" className="text-sm font-medium">
                Sous-titre / Description de l&apos;annonce
              </label>
              <input
                type="text"
                id="countdownSubtitle"
                name="countdownSubtitle"
                defaultValue={
                  defaultValues.countdownSubtitle ??
                  "Le compte à rebours est lancé. Préparez-vous à entrer dans l'histoire."
                }
                placeholder="Ex: Ouverture des portes du serveur et début du Chapitre I..."
                className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </div>

            {/* Lien d'invitation Discord */}
            <div className="space-y-1.5">
              <label htmlFor="countdownDiscordUrl" className="text-sm font-medium">
                Lien d&apos;invitation Discord
              </label>
              <div className="relative flex items-center">
                <DiscordOfficialIcon className="absolute left-3 size-4 text-[#5865F2]" />
                <input
                  type="url"
                  id="countdownDiscordUrl"
                  name="countdownDiscordUrl"
                  defaultValue={defaultValues.countdownDiscordUrl || "https://discord.gg/hyori"}
                  placeholder="https://discord.gg/hyori"
                  className="border-input bg-background focus:ring-ring w-full rounded-md border py-2 pr-3 pl-9 font-mono text-sm text-xs focus:ring-2 focus:outline-none"
                />
              </div>
              <p className="text-muted-foreground text-[12px]">
                Lien ouvert par le bouton Discord dans la barre de navigation et sur le compte à
                rebours.
              </p>
            </div>
          </div>

          {/* Date et Heure cible avec raccourcis et sélecteur simplifié */}
          <div className="bg-card space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-primary size-4.5" />
                <span className="text-sm font-medium">
                  Date &amp; Heure de fin du compte à rebours
                </span>
              </div>
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

            {/* Champ invisible pour la soumission FormData */}
            <input
              type="hidden"
              id="countdownTargetDate"
              name="countdownTargetDate"
              value={combinedTargetDate}
            />

            {/* Raccourcis en 1 clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-muted-foreground mr-1 text-[11px] font-medium">
                Raccourcis rapides :
              </span>
              <button
                type="button"
                onClick={() => setPreset("tonight")}
                className="border-border bg-background text-foreground/90 hover:border-primary/50 hover:bg-muted rounded-md border px-2.5 py-1 text-xs transition-colors"
              >
                Ce soir (20h)
              </button>
              <button
                type="button"
                onClick={() => setPreset("tomorrow")}
                className="border-border bg-background text-foreground/90 hover:border-primary/50 hover:bg-muted rounded-md border px-2.5 py-1 text-xs transition-colors"
              >
                Demain (18h)
              </button>
              <button
                type="button"
                onClick={() => setPreset("weekend")}
                className="border-border bg-background text-foreground/90 hover:border-primary/50 hover:bg-muted rounded-md border px-2.5 py-1 text-xs transition-colors"
              >
                Ce samedi (18h)
              </button>
              <button
                type="button"
                onClick={() => setPreset("in3days")}
                className="border-border bg-background text-foreground/90 hover:border-primary/50 hover:bg-muted rounded-md border px-2.5 py-1 text-xs transition-colors"
              >
                +3 jours
              </button>
              <button
                type="button"
                onClick={() => setPreset("in1week")}
                className="border-border bg-background text-foreground/90 hover:border-primary/50 hover:bg-muted rounded-md border px-2.5 py-1 text-xs transition-colors"
              >
                +1 semaine
              </button>
            </div>

            {/* Sélecteurs séparés Jour et Heure */}
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Jour :</label>
                <input
                  type="date"
                  value={datePart}
                  onChange={(e) => setDatePart(e.target.value)}
                  className="border-input bg-background focus:ring-ring w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  Heure de lancement :
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={timePart}
                    onChange={(e) => setTimePart(e.target.value)}
                    className="border-input bg-background focus:ring-ring w-full cursor-pointer rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  <div className="hidden items-center gap-1 sm:flex">
                    {["14:00", "18:00", "20:00", "21:00"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setTimePart(h)}
                        className={`rounded-md border px-2 py-1.5 font-mono text-xs transition-colors ${
                          timePart === h
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {h.replace(":00", "h")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Aperçu en direct */}
            {frenchDatePreview ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-400">
                <CalendarBlank className="size-4 shrink-0" />
                <span>Prévu pour : {frenchDatePreview}</span>
                {relativeTimePreview && (
                  <span className="text-amber-300/80">({relativeTimePreview})</span>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">Aucune date sélectionnée.</p>
            )}
          </div>

          {/* Configuration Vidéo */}
          <div className="bg-card space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VideoCamera className="text-primary size-4.5" />
                <span className="text-sm font-medium">Vidéo d&apos;arrière-plan (2e plan)</span>
              </div>
              <input type="hidden" name="countdownVideoType" value={videoType} />
              <input type="hidden" name="countdownVideoUrl" value={videoUrl} />

              {/* Sélecteur de méthode */}
              <div className="bg-muted inline-flex rounded-lg border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setVideoType("URL")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                    videoType === "URL"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LinkIcon className="size-3.5" />
                  Lien / YouTube
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType("FILE")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                    videoType === "FILE"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UploadSimple className="size-3.5" />
                  Fichier Vidéo
                </button>
              </div>
            </div>

            {/* Méthode URL */}
            {videoType === "URL" && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs">
                  Lien direct vidéo (.mp4, .webm) ou lien YouTube (ex:
                  https://www.youtube.com/watch?v=...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  {videoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setVideoUrl("")}
                      title="Effacer l'URL"
                    >
                      <Trash className="text-destructive size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Méthode Upload Fichier */}
            {videoType === "FILE" && (
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs">
                  Téléversez un fichier vidéo local (MP4, WEBM, MOV - max 100 Mo). Le fichier sera
                  stocké sur le serveur et diffusé en boucle fluide.
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="border-input hover:border-primary/50 bg-muted/40 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm font-medium transition-colors">
                    <UploadSimple className="text-primary size-4.5" />
                    <span>
                      {isUploadingVideo ? "Téléversement..." : "Sélectionner un fichier vidéo"}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={handleFileUpload}
                      disabled={isUploadingVideo}
                      className="sr-only"
                    />
                  </label>

                  {videoUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-500">
                      <Check className="size-4 shrink-0" weight="bold" />
                      <span className="max-w-[280px] truncate">Vidéo active : {videoUrl}</span>
                      <button
                        type="button"
                        onClick={() => setVideoUrl("")}
                        className="text-destructive hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prévisualisation Vidéo */}
            {videoUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border bg-black/60">
                <div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-xs">
                  <span>Prévisualisation de l&apos;arrière-plan</span>
                  <span className="font-mono text-[11px]">{videoUrl}</span>
                </div>
                <div className="relative aspect-video max-h-48 w-full overflow-hidden">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FONCTIONNALITÉS GLOBALES (MODULES JOUEURS) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Fonctionnalités Générales du Site</h2>

        <SettingToggle
          name="registrationEnabled"
          label="Inscriptions (via Discord)"
          description="Autoriser la création de nouveaux comptes. Si désactivé, les nouveaux joueurs ne pourront pas se connecter."
          defaultChecked={defaultValues.registrationEnabled}
        />

        <SettingToggle
          name="interviewBookingEnabled"
          label="Réservation d'entretiens Whitelist"
          description="Permettre aux joueurs en liste d'attente de réserver un créneau pour leur entretien."
          defaultChecked={defaultValues.interviewBookingEnabled}
        />

        <SettingToggle
          name="ticketCreationEnabled"
          label="Ouverture de tickets"
          description="Autoriser la création de nouveaux tickets de support."
          defaultChecked={defaultValues.ticketCreationEnabled}
        />

        <SettingToggle
          name="rpTrackingAccessEnabled"
          label="Accès au Suivi RP"
          description="Autoriser l'accès aux conversations de Suivi RP."
          defaultChecked={defaultValues.rpTrackingAccessEnabled}
        />

        <SettingToggle
          name="chapterWritingEnabled"
          label="Écriture de narration (Chapitres)"
          description="Autoriser les joueurs à écrire ou modifier leurs chapitres (la lecture reste accessible)."
          defaultChecked={defaultValues.chapterWritingEnabled}
        />

        <SettingToggle
          name="bdaReportSubmissionEnabled"
          label="Soumission de rapports GC (BDA)"
          description="Autoriser la création de nouveaux rapports au Gestionnaire des Conflits."
          defaultChecked={defaultValues.bdaReportSubmissionEnabled}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PAGES PUBLIQUES DU SITE */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4 border-t pt-4">
        <div>
          <h2 className="text-base font-semibold">Pages Publiques du Site</h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Activez ou désactivez l&apos;accès public à ces sections. Si une page est désactivée,
            elle disparaît de la barre de navigation et renvoie une erreur 404 en cas d&apos;accès
            direct.
          </p>
        </div>

        <SettingToggle
          name="publicNewsEnabled"
          label="Page Actualités"
          description="Rendre accessible la page des annonces et mises à jour (/news)."
          defaultChecked={defaultValues.publicNewsEnabled ?? true}
        />

        <SettingToggle
          name="publicRulesEnabled"
          label="Page Règlement"
          description="Rendre accessible la page de consultation du règlement officiel (/rules)."
          defaultChecked={defaultValues.publicRulesEnabled ?? true}
        />

        <SettingToggle
          name="publicLoreEnabled"
          label="Page Lore"
          description="Rendre accessible la page présentant l'univers et le lore (/lore)."
          defaultChecked={defaultValues.publicLoreEnabled ?? true}
        />

        <SettingToggle
          name="publicGalleryEnabled"
          label="Page Galerie"
          description="Rendre accessible la page de la galerie communautaire (/gallery)."
          defaultChecked={defaultValues.publicGalleryEnabled ?? true}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SERVEUR MINECRAFT */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4 border-t pt-4">
        <div>
          <h2 className="text-base font-semibold">Serveur Minecraft & Liaison de compte</h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Configurez les informations du serveur de liaison affichées aux nouveaux joueurs et
            utilisées par le plugin.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="minecraftServerAddress" className="text-sm font-medium">
              Adresse du serveur (IP ou Domaine)
            </label>
            <input
              type="text"
              id="minecraftServerAddress"
              name="minecraftServerAddress"
              defaultValue={defaultValues.minecraftServerAddress}
              placeholder="auth.hyori-rp.fr"
              className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground text-[12px]">
              Adresse sur laquelle les joueurs doivent se connecter pour lier leur compte.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="minecraftServerVersion" className="text-sm font-medium">
              Version Minecraft recommandée
            </label>
            <input
              type="text"
              id="minecraftServerVersion"
              name="minecraftServerVersion"
              defaultValue={defaultValues.minecraftServerVersion}
              placeholder="1.21.11"
              className="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground text-[12px]">
              Version indicative affichée aux joueurs sur le site.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="minecraftAuthCommand" className="text-sm font-medium">
            Préfixe de la commande en jeu
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
          <p className="text-muted-foreground text-[12px]">
            Par exemple : &quot;auth&quot; (donnera <code>/auth &lt;code&gt;</code>) ou
            &quot;link&quot; (donnera <code>/link &lt;code&gt;</code>).
          </p>
        </div>
      </div>

      {/* Bouton de Soumission */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending || isUploadingVideo} className="gap-2">
          <Check className="size-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}

function SettingToggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors">
      <div className="space-y-0.5">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            id={name}
            name={name}
            value="true"
            defaultChecked={defaultChecked}
            className="peer sr-only"
          />
          <div className="peer bg-muted border-input peer-checked:bg-primary peer-focus:ring-ring dark:peer-focus:ring-primary h-6 w-11 rounded-full border peer-focus:ring-2 peer-focus:outline-none after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
        </label>
      </div>
    </div>
  );
}

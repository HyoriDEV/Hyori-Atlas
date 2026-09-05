import { getGlobalSettings } from "@/lib/services/settings-service";
import { VideoBackground } from "@/components/countdown/video-background";
import { CountdownTimer } from "@/components/countdown/countdown-timer";
import { LockScroll } from "@/components/countdown/lock-scroll";

export default async function HomePage() {
  const settings = await getGlobalSettings();

  if (settings.countdownEnabled) {
    return (
      <>
        <LockScroll />
        <div className="fixed inset-0 top-18 z-20 flex h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden bg-black">
          {/* 2e plan : Vidéo d'arrière-plan */}
          <VideoBackground
            videoUrl={settings.countdownVideoUrl}
            videoType={settings.countdownVideoType}
          />

          {/* 1er plan : Compte à rebours */}
          <CountdownTimer
            targetDateStr={
              settings.countdownTargetDate
                ? new Date(settings.countdownTargetDate).toISOString()
                : null
            }
            badgeText={settings.countdownBadgeText || "Hyori RP — Lancement Officiel"}
            title={settings.countdownTitle || "Lancement Officiel de Hyori RP"}
            subtitle={settings.countdownSubtitle}
            discordUrl={settings.countdownDiscordUrl || "https://discord.gg/hyori"}
          />
        </div>
      </>
    );
  }

  // Si le compte à rebours est inactif, affichage d'accueil normal
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
        Bienvenue sur Hyori RP
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Plongez dans un univers roleplay médiéval unique, façonné par les joueurs et porté par une communauté passionnée.
      </p>
    </div>
  );
}

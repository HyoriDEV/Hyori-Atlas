import { getGlobalSettings } from "@/lib/services/settings-service";
import { VideoBackground } from "@/components/countdown/video-background";
import { CountdownTimer } from "@/components/countdown/countdown-timer";
import { LockScroll } from "@/components/countdown/lock-scroll";

export default async function HomePage() {
  const settings = await getGlobalSettings();

  return (
    <>
      <LockScroll />
      <div className="fixed inset-0 top-18 z-20 flex h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden bg-black">
        {/* 2e plan : Vidéo d'arrière-plan */}
        <VideoBackground
          videoUrl={settings.countdownVideoUrl}
          videoType={settings.countdownVideoType}
        />

        {/* 1er plan : Contenu d'accueil avec ou sans compte à rebours */}
        <CountdownTimer
          countdownEnabled={settings.countdownEnabled}
          targetDateStr={
            settings.countdownTargetDate
              ? new Date(settings.countdownTargetDate).toISOString()
              : null
          }
          badgeText={settings.countdownBadgeText || "Hyori RP — Lancement Officiel"}
          title={settings.countdownTitle || "Lancement Officiel de Hyori RP"}
          subtitle={settings.countdownSubtitle}
          discordUrl={settings.countdownDiscordUrl || "https://discord.gg/hyori"}
          loreEnabled={settings.publicLoreEnabled}
        />
      </div>
    </>
  );
}

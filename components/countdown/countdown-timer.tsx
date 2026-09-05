"use client";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkle,
  CalendarBlank,
} from "@phosphor-icons/react";

import { DiscordOfficialIcon } from "@/components/icons/discord-icon";
export { DiscordOfficialIcon };

interface CountdownTimerProps {
  targetDateStr?: string | null;
  badgeText?: string | null;
  title: string;
  subtitle?: string | null;
  discordUrl?: string | null;
  loreEnabled?: boolean;
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDate: Date | null): TimeRemaining {
  if (!targetDate || isNaN(targetDate.getTime())) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const now = new Date().getTime();
  const target = targetDate.getTime();
  const total = target - now;

  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds, isExpired: false };
}

export function CountdownTimer({
  targetDateStr,
  badgeText = "Hyori RP — Lancement Officiel",
  title,
  subtitle,
  discordUrl = "https://discord.gg/hyori",
  loreEnabled = true,
}: CountdownTimerProps) {
  const targetDate = useMemo(() => {
    return targetDateStr ? new Date(targetDateStr) : null;
  }, [targetDateStr]);

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate)
  );

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  // Formatage de la date cible en français selon la typographie de la charte
  const formattedTargetDate = useMemo(() => {
    if (!targetDate || isNaN(targetDate.getTime())) return null;
    try {
      const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(targetDate);
      const day = targetDate.getDate();
      const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(targetDate);
      const year = targetDate.getFullYear();
      const hours = String(targetDate.getHours()).padStart(2, "0");
      const minutes = String(targetDate.getMinutes()).padStart(2, "0");

      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} ${month} ${year} à ${hours}h${minutes}`;
    } catch {
      return null;
    }
  }, [targetDate]);

  const units = [
    { label: "Jours", value: timeLeft.days },
    { label: "Heures", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Secondes", value: timeLeft.seconds },
  ];

  return (
    <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-4 py-6 text-center select-none sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 md:gap-7">
        {/* En-tête éditorial personnalisable avec filets latéraux (Charte Hyori RP) */}
        <div className="flex items-center gap-3">
          <span className="h-px w-6 sm:w-10 bg-[#323232]" />
          <span className="font-sans text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-[#d4af35]">
            {badgeText || "Hyori RP — Lancement Officiel"}
          </span>
          <span className="h-px w-6 sm:w-10 bg-[#323232]" />
        </div>

        {/* Titre Principal (Anthropic Serif) & Sous-titre (Source Serif) */}
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-normal tracking-tight text-[#f8f5e8] sm:text-5xl md:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mx-auto max-w-2xl font-sans text-sm leading-relaxed text-[#a3a39e] sm:text-base md:text-lg">
              {subtitle}
            </p>
          )}

          {formattedTargetDate && (
            <div className="inline-flex items-center gap-2 rounded-md border border-[#262626] bg-[#1a1a1a]/70 px-3.5 py-1 text-xs font-sans text-[#a3a39e]">
              <CalendarBlank className="size-3.5 text-[#d4af35]" />
              <span>{formattedTargetDate}</span>
            </div>
          )}
        </div>

        {/* Bloc Compte à Rebours - Cartes sobres de la charte avec chiffres en Anthropic Serif */}
        {!timeLeft.isExpired ? (
          <div className="grid w-full max-w-2xl grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {units.map((unit) => (
              <div
                key={unit.label}
                className="group relative flex flex-col items-center justify-center rounded-lg border border-[#262626] bg-[#1a1a1a]/90 p-3.5 shadow-sm transition-all duration-300 hover:border-[#d4af35]/40 hover:bg-[#1f1f1f] sm:p-5 md:p-6"
              >
                <span className="font-heading text-3xl font-normal tracking-normal text-[#f8f5e8] sm:text-5xl md:text-6xl">
                  {mounted ? String(unit.value).padStart(2, "0") : "00"}
                </span>
                <span className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-[#a3a39e] transition-colors group-hover:text-[#d4af35] sm:text-[11px]">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* Écran d'ouverture du serveur */
          <div className="flex flex-col items-center gap-3 rounded-lg border border-[#d4af35]/40 bg-[#1a1a1a]/90 p-6 shadow-xl sm:p-8">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-[#d4af35]/15 text-[#e9d15c]">
              <Sparkle className="size-6" weight="bold" />
            </div>
            <h2 className="font-heading text-2xl font-normal text-[#f8f5e8] sm:text-3xl">
              Le serveur est officiellement ouvert
            </h2>
            <p className="max-w-md font-sans text-sm text-[#a3a39e] leading-relaxed">
              Rejoignez dès maintenant notre communauté sur Discord et plongez dans l&apos;univers de Hyori RP.
            </p>
          </div>
        )}

        {/* Boutons d'Action Rapide - Vrai Logo Discord Clyde & Typographie Anthropic Serif */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <a
            href={discordUrl || "https://discord.gg/hyori"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading inline-flex items-center gap-2.5 rounded-md bg-[#e9d15c] px-6 py-2.5 text-sm font-medium text-[#121212] transition-colors hover:bg-[#d4af35] active:translate-y-px shadow-xs cursor-pointer"
          >
            <DiscordOfficialIcon className="size-4.5" />
            <span>Discord Officiel</span>
          </a>

          {loreEnabled && (
            <Link
              href="/lore"
              className="font-heading inline-flex items-center gap-2.5 rounded-md border border-[#323232] bg-[#1a1a1a]/80 px-6 py-2.5 text-sm font-medium text-[#f8f5e8] transition-colors hover:border-[#d4af35]/50 hover:bg-[#262626] active:translate-y-px shadow-xs cursor-pointer"
            >
              <BookOpen className="size-4.5 text-[#e9d15c]" weight="bold" />
              <span>Consulter le Lore</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

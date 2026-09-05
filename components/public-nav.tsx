import Link from "next/link";
import Image from "next/image";

import { auth } from "@/auth";
import { PlayerSpaceCta } from "@/components/player-space-cta";
import { getGlobalSettings } from "@/lib/services/settings-service";

export async function PublicNav() {
  const session = await auth();
  const settings = await getGlobalSettings();

  const navLinks = [
    { label: "Actualités", href: "/news", enabled: settings.publicNewsEnabled },
    { label: "Galerie", href: "/gallery", enabled: settings.publicGalleryEnabled },
    { label: "Lore", href: "/lore", enabled: settings.publicLoreEnabled },
    { label: "Règlement", href: "/rules", enabled: settings.publicRulesEnabled },
  ].filter((item) => item.enabled !== false);

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.discordUsername ?? session.user.name ?? "Joueur",
        role: session.user.role,
        avatarUrl: session.user.discordAvatarUrl,
      }
    : null;

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-18 max-w-[960px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading flex h-full items-center gap-2.5 text-base font-normal transition-opacity hover:opacity-85"
        >
          <Image
            src="/HYORI-LOGO-COMPRESSED.jpg"
            alt="Logo Hyori RP"
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-[8px] object-cover shadow-xs"
          />
          <span>Hyori RP</span>
        </Link>
        <nav className="flex h-full items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground flex h-full items-center text-[15px] font-semibold transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <PlayerSpaceCta
            user={user}
            registrationEnabled={settings.registrationEnabled}
            discordUrl={settings.countdownDiscordUrl || "https://discord.gg/hyori"}
          />
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

import { auth } from "@/auth";
import { PlayerSpaceCta } from "@/components/player-space-cta";

const navLinks = [
  { label: "Actualités", href: "/news" },
  { label: "Galerie", href: "/gallery" },
  { label: "Lore", href: "/lore" },
  { label: "Règlement", href: "/rules" },
];

export async function PublicNav() {
  const session = await auth();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-18 max-w-[960px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-heading flex h-full items-center text-base font-normal">
          Hyori RP
        </Link>
        <nav className="flex h-full items-center gap-4 sm:gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground flex h-full items-center text-[15px] font-semibold transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <PlayerSpaceCta isAuthenticated={Boolean(session?.user)} />
        </nav>
      </div>
    </header>
  );
}

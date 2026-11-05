"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Liens de la barre publique repliés dans un menu sur téléphone (la barre complète déborde).
 * Même pastille ronde que les boutons de l'espace joueur à côté.
 */
export function PublicNavMobileMenu({ links }: { links: { label: string; href: string }[] }) {
  if (links.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu"
        className="border-border/80 bg-card/60 text-muted-foreground hover:text-foreground flex size-9 cursor-pointer items-center justify-center rounded-full border shadow-xs transition-colors md:hidden"
      >
        <List className="size-4.5" weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1.5">
        {links.map((link) => (
          <DropdownMenuItem
            key={link.href}
            render={<Link href={link.href} />}
            className="cursor-pointer py-2 text-sm font-semibold"
          >
            {link.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

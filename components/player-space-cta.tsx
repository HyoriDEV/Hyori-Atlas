"use client";

import Link from "next/link";

import { signInWithDiscord } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function PlayerSpaceCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return <Button render={<Link href="/player" />}>Espace Joueur</Button>;
  }

  return (
    <form action={signInWithDiscord.bind(null, "/player")}>
      <Button type="submit">Espace Joueur</Button>
    </form>
  );
}

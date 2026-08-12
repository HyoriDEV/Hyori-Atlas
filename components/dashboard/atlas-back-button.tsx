"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export function AtlasBackButton() {
  return (
    <Button
      render={<Link href="/dashboard/atlas" aria-label="Retour à l'Atlas" />}
      variant="outline"
      size="icon"
    >
      <CaretLeft />
    </Button>
  );
}

"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export function AtlasBackButton({ href = "/staff/atlas" }: { href?: string }) {
  return (
    <Button render={<Link href={href} aria-label="Retour" />} variant="outline" size="icon">
      <CaretLeft />
    </Button>
  );
}

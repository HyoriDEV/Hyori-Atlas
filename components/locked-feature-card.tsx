"use client";

import { LockSimple } from "@phosphor-icons/react";

import { Card, CardContent } from "@/components/ui/card";

export function LockedFeatureCard({
  description = "Cette section n'est pas encore accessible en fonction de ton statut d'inscription.",
}: {
  description?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <LockSimple className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

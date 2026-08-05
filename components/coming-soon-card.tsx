"use client";

import { HourglassMedium } from "@phosphor-icons/react";

import { Card, CardContent } from "@/components/ui/card";

export function ComingSoonCard({
  title,
  description = "Cette section est en cours de développement et sera bientôt disponible.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <HourglassMedium className="text-muted-foreground size-8" />
        <div className="space-y-1">
          <p className="text-base font-medium">{title}</p>
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

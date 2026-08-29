import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AtlasEvaluateSheetButton({
  playerId,
  label = "Évaluer la fiche personnage",
}: {
  playerId: string;
  label?: string;
}) {
  return (
    <Button size="sm" render={<Link href={`/staff/atlas/${playerId}/evaluation`} />}>
      {label}
    </Button>
  );
}

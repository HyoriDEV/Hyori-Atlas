import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AtlasEvaluateSheetButton({
  playerId,
  sheetId,
  label = "Évaluer la fiche personnage",
}: {
  playerId: string;
  sheetId?: string;
  label?: string;
}) {
  const href = sheetId
    ? `/staff/atlas/${playerId}/evaluation?sheetId=${sheetId}`
    : `/staff/atlas/${playerId}/evaluation`;

  return (
    <Button size="sm" render={<Link href={href} />}>
      {label}
    </Button>
  );
}

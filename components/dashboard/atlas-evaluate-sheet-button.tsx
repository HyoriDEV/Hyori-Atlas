import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AtlasEvaluateSheetButton({
  playerId,
  sheetId,
  label = "Évaluer la fiche personnage",
  variant,
}: {
  playerId: string;
  sheetId?: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const href = sheetId
    ? `/staff/atlas/${playerId}/evaluation?sheetId=${sheetId}`
    : `/staff/atlas/${playerId}/evaluation`;

  return (
    <Button size="sm" variant={variant} render={<Link href={href} prefetch={false} />}>
      {label}
    </Button>
  );
}

import { requireRole } from "@/lib/dal";
import { staffNavItems } from "@/lib/navigation";
import { ComingSoonCard } from "@/components/coming-soon-card";

export default async function BacklogPage() {
  const item = staffNavItems.find((i) => i.href === "/dashboard/backlog")!;
  await requireRole(item.roles);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Backlog</h1>
      <ComingSoonCard title="Bientôt disponible" />
    </div>
  );
}

import { requireRole } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { RulesManager } from "./rules-manager";

export default async function StaffRulesPage() {
  await requireRole([Role.ADMIN]);

  const sections = await prisma.ruleSection.findMany({
    orderBy: [{ isPreface: "desc" }, { order: "asc" }],
    include: {
      articles: {
        orderBy: { order: "asc" },
        include: {
          rules: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Règlement</h1>
      </div>
      <RulesManager initialSections={sections} />
    </div>
  );
}

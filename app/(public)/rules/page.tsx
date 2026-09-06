import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGlobalSettings } from "@/lib/services/settings-service";
import { ComingSoonCard } from "@/components/coming-soon-card";
import { RulesView } from "./rules-view";

export default async function RulesPage() {
  const settings = await getGlobalSettings();
  if (!settings.publicRulesEnabled) {
    notFound();
  }

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
      <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Règlement</h1>

      {sections.length === 0 ? (
        <ComingSoonCard
          title="Règlement à venir"
          description="Le règlement officiel est en cours de préparation et sera publié très prochainement."
        />
      ) : (
        <RulesView sections={sections} />
      )}
    </div>
  );
}

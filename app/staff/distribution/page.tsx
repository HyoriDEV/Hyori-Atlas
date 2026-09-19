import type { Metadata } from "next";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getPlayerAffiliationOverview } from "@/lib/services/player-affiliation-overview-service";
import { DistributionManager } from "@/components/staff/distribution/distribution-manager";
import { DistributionOverview } from "@/components/staff/distribution/distribution-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Distribution des classes",
};

export default async function DistributionStaffPage() {
  await requireRole([Role.ADMIN, Role.RP_TRACKING]);

  const [classes, overview] = await Promise.all([
    prisma.playerClass.findMany({
      include: {
        roles: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    getPlayerAffiliationOverview(),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
      <Tabs defaultValue="equilibrage" className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-2xl font-semibold">Distribution des classes</h1>
          <TabsList className="bg-muted/70 w-fit p-1">
            <TabsTrigger value="equilibrage">Équilibrage</TabsTrigger>
            <TabsTrigger value="vue-ensemble">Vue d&apos;ensemble</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="equilibrage" className="mt-0">
          <DistributionManager initialClasses={classes} />
        </TabsContent>

        <TabsContent value="vue-ensemble" className="mt-0">
          <DistributionOverview overview={overview} playerClasses={classes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

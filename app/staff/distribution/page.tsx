import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { DistributionManager } from "@/components/staff/distribution/distribution-manager";

export const metadata = {
  title: "Distribution des classes | Hyori Staff",
};

export default async function DistributionStaffPage() {
  await requireRole([Role.ADMIN, Role.RP_TRACKING]);

  const classes = await prisma.playerClass.findMany({
    include: {
      roles: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Distribution des classes</h1>
      <DistributionManager initialClasses={classes} />
    </div>
  );
}

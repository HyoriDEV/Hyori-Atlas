import { requireUser } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { ComingSoonCard } from "@/components/coming-soon-card";
import { LockedFeatureCard } from "@/components/locked-feature-card";

export default async function RpTrackingPage() {
  const user = await requireUser();
  const unlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELISTED
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Suivi RP</h1>
      {unlocked ? <ComingSoonCard title="Bientôt disponible" /> : <LockedFeatureCard />}
    </div>
  );
}

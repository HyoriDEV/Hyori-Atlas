import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { CharacterSheetStatus, InterviewBookingStatus, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { interviewBookingStatusLabels, isRegistrationStatusAtLeast } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { InterviewCalendar, type InterviewSlotInfo } from "@/components/player/interview-calendar";

export default async function InterviewPage() {
  const user = await requireUser();
  const waitlistUnlocked = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELIST_IN_PROGRESS
  );

  if (!waitlistUnlocked) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold">Entretien whitelist</h1>
        <LockedFeatureCard description="Disponible une fois ta candidature acceptée depuis la liste d'attente par un administrateur." />
      </div>
    );
  }

  const [slots, latestBooking, characterSheet] = await Promise.all([
    prisma.interviewSlot.findMany({
      where: { startsAt: { gte: new Date() } },
      include: { booking: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.interviewBooking.findFirst({
      where: { playerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.characterSheet.findUnique({
      where: { playerId: user.id },
    }),
  ]);

  const isSheetValidated =
    characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED ||
    user.registrationStatus === RegistrationStatus.WHITELISTED;

  if (!isSheetValidated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold">Entretien whitelist</h1>
        <LockedFeatureCard description="Disponible une fois ta fiche personnage validée par l'équipe." />
      </div>
    );
  }

  const slotInfos: InterviewSlotInfo[] = slots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt,
    isBooked: Boolean(slot.booking),
  }));

  const bookingDisabled =
    latestBooking !== null &&
    (latestBooking.status === InterviewBookingStatus.REGISTERED ||
      latestBooking.status === InterviewBookingStatus.ACCEPTED);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Choisis un créneau.</h1>
        {latestBooking && <Badge>{interviewBookingStatusLabels[latestBooking.status]}</Badge>}
      </div>
      {latestBooking?.status === InterviewBookingStatus.CHANGES_REQUESTED && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-500 text-sm font-medium">
          Un administrateur a demandé un nouvel entretien. Veuillez réserver un autre créneau ci-dessous.
        </div>
      )}
      <p className="text-muted-foreground max-w-2xl text-sm">
        Un appel Discord sera organisé avec le staff à cette date. Tu y présenteras ton projet RP
        basé sur ta fiche personnage, et les règles du serveur te seront ensuite expliquées. Sois
        ponctuel !
      </p>
      <InterviewCalendar slots={slotInfos} bookingDisabled={bookingDisabled} />
    </div>
  );
}


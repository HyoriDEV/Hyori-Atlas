import { redirect } from "next/navigation";
import { requireActivePlayer } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  CharacterSheetStatus,
  InterviewBookingStatus,
  RegistrationStatus,
} from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { CopyButton } from "@/components/player/copy-button";
import { MinecraftLinkDialog } from "@/components/player/minecraft-link-dialog";
import { StepIcon } from "@/components/player/step-icon";
import { cn } from "@/lib/utils";

export default async function GettingStartedPage() {
  const user = await requireActivePlayer();

  if (user.registrationStatus === RegistrationStatus.WHITELISTED) {
    redirect("/player/character-sheet");
  }

  const minecraftLinked = Boolean(user.minecraftUuid);

  const [characterSheet, latestBooking] = await Promise.all([
    prisma.characterSheet.findUnique({
      where: { playerId: user.id },
    }),
    prisma.interviewBooking.findFirst({
      where: { playerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isWaitlistPassed = isRegistrationStatusAtLeast(
    user.registrationStatus,
    RegistrationStatus.WHITELIST_IN_PROGRESS
  );
  const isSheetValidated =
    isWaitlistPassed && characterSheet?.reviewStatus === CharacterSheetStatus.VALIDATED;
  const isInterviewAccepted =
    isSheetValidated && latestBooking?.status === InterviewBookingStatus.ACCEPTED;

  const steps = [
    { label: "Connexion Minecraft", done: minecraftLinked },
    {
      label: "Liste d'attente",
      done: isWaitlistPassed,
    },
    {
      label: "Fiche personnage",
      done: isSheetValidated,
    },
    {
      label: "Entretien whitelist",
      done: isInterviewAccepted,
    },
    {
      label: "Inscription terminée",
      done: false,
    },
  ];

  let statusDescription = "Connecte-toi à Minecraft pour confirmer ton identité.";
  if (user.registrationStatus === RegistrationStatus.WAITLIST) {
    statusDescription =
      "Tu es inscrit·e sur la liste d'attente pour la whitelist Hyori. Tu seras notifié·e sur Discord dès la mise à jour de ton statut.";
  } else if (user.registrationStatus === RegistrationStatus.WHITELIST_IN_PROGRESS) {
    if (!isSheetValidated) {
      statusDescription =
        "Tu as passé la liste d'attente ! Remplis ta fiche personnage pour la soumettre à la validation de l'équipe RP.";
    } else if (!isInterviewAccepted) {
      statusDescription =
        "Ta fiche personnage est validée ! Réserve un créneau pour passer ton entretien de whitelist.";
    } else {
      statusDescription =
        "Ton entretien a été validé ! Un administrateur va finaliser ta whitelist.";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Premier pas</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-row items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase">Compte Discord</span>
              <Badge variant="inverted" className="text-xs font-bold">
                Connecté
              </Badge>
            </div>
            <CardContent className="flex items-center gap-3">
              <Avatar size="xl">
                <AvatarImage
                  src={user.discordAvatarUrl ?? undefined}
                  alt={user.discordDisplayName ?? user.discordUsername ?? ""}
                />
                <AvatarFallback>
                  {(user.discordDisplayName ?? user.discordUsername ?? "—").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-base font-medium">
                  {user.discordDisplayName ?? user.discordUsername ?? "—"} (
                  {user.discordUsername ?? "—"})
                </span>
                <div className="text-muted-foreground flex items-center text-xs">
                  <span>ID: {user.discordId ?? "—"}</span>
                  {user.discordId && <CopyButton value={user.discordId} />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="flex flex-row items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase">Compte Minecraft</span>
              <Badge
                variant={minecraftLinked ? "inverted" : "outline"}
                className="text-xs font-bold"
              >
                {minecraftLinked ? "Connecté" : "Non lié"}
              </Badge>
            </div>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SkinHead
                  size="xl"
                  username={user.minecraftUsername ?? user.minecraftUuid ?? undefined}
                />
                <div className="flex flex-col">
                  <span className="text-base font-medium">
                    {minecraftLinked ? (user.minecraftUsername ?? "—") : "—"}
                  </span>
                  <div className="text-muted-foreground flex items-center text-xs">
                    <span>UUID: {minecraftLinked ? (user.minecraftUuid ?? "—") : "—"}</span>
                    {minecraftLinked && user.minecraftUuid && (
                      <CopyButton value={user.minecraftUuid} />
                    )}
                  </div>
                </div>
              </div>
              <MinecraftLinkDialog linked={minecraftLinked} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progression de l&apos;inscription</CardTitle>
            <CardDescription>{statusDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1">
              {(() => {
                const currentStepIndex = steps.findIndex((step) => !step.done);
                return steps.map((step, index) => {
                  const isCurrent = index === currentStepIndex;
                  return (
                    <li key={step.label} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <StepIcon done={step.done} current={isCurrent} />
                        {index < steps.length - 1 && (
                          <div
                            className={cn("mt-1 h-4 w-px", step.done ? "bg-primary" : "bg-border")}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          step.done || isCurrent ? "font-medium" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                });
              })()}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

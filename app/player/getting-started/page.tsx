import { getPlayerState } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { isRegistrationStatusAtLeast } from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkinHead } from "@/components/ui/skin-head";
import { CopyButton } from "@/components/player/copy-button";
import { MinecraftLinkDialog } from "@/components/player/minecraft-link-dialog";
import { StepIcon } from "@/components/player/step-icon";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Création de compte", done: () => true },
  { label: "Connexion Minecraft", done: (minecraftLinked: boolean) => minecraftLinked },
  {
    label: "Liste d'attente",
    done: (_: boolean, status: RegistrationStatus) =>
      isRegistrationStatusAtLeast(status, RegistrationStatus.WAITLIST),
  },
  {
    label: "Inscription à la whitelist",
    done: (_: boolean, status: RegistrationStatus) =>
      isRegistrationStatusAtLeast(status, RegistrationStatus.WHITELIST_IN_PROGRESS),
  },
];

const statusDescriptions: Record<RegistrationStatus, string> = {
  [RegistrationStatus.NEW]: "Connecte-toi à Minecraft pour confirmer ton identité.",
  [RegistrationStatus.WAITLIST]:
    "Tu es inscrit sur la liste d'attente pour la whitelist Hyori. Tu seras notifié sur Discord dès la mise à jour de ton statut.",
  [RegistrationStatus.WHITELIST_IN_PROGRESS]:
    "Remplis ta fiche personnage et réserve un créneau pour passer l'entretien de whitelist.",
  [RegistrationStatus.WHITELISTED]: "Inscription terminée.",
  [RegistrationStatus.REJECTED]: "Inscription terminée.",
};

export default async function GettingStartedPage() {
  const user = await getPlayerState();
  const minecraftLinked = Boolean(user.minecraftUuid);
  const isRejected = user.registrationStatus === RegistrationStatus.REJECTED;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Premiers pas</h1>
      {isRejected && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Candidature refusée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Votre candidature à la liste d'attente a été refusée par le staff.
            </p>
          </CardContent>
        </Card>
      )}
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
            <CardTitle>Progression de l'inscription</CardTitle>
            <CardDescription>{statusDescriptions[user.registrationStatus]}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-1">
              {steps.map((step, index) => {
                const isDone = step.done(minecraftLinked, user.registrationStatus);
                return (
                  <li key={step.label} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <StepIcon done={isDone} />
                      {index < steps.length - 1 && (
                        <div className={cn("mt-1 h-4 w-px", isDone ? "bg-primary" : "bg-border")} />
                      )}
                    </div>
                    <span
                      className={cn("text-sm", isDone ? "font-medium" : "text-muted-foreground")}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

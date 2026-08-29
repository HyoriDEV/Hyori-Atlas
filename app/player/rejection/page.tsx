import { redirect } from "next/navigation";
import { getPlayerState } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RejectionPage() {
  const user = await getPlayerState();

  if (user.registrationStatus !== RegistrationStatus.REJECTED) {
    redirect("/player/getting-started");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            Mise à jour de ton statut d&apos;inscription
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-col gap-4 text-base leading-relaxed">
          <p>
            Merci pour ton inscription sur la liste d&apos;attente de Hyori RP. En raison d&apos;un
            nombre de places limité, ta candidature pour ce projet n&apos;a pas été retenue.
            L&apos;accès au reste du parcours d&apos;inscription est donc clos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

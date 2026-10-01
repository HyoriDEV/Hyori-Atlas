import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPlayerState } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Statut d'inscription",
};

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
            Ton profil ne correspond pas à la vision portée par la direction à l&apos;égard du
            projet Hyori RP. Nous te remercions pour ta participation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

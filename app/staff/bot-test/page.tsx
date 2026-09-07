import { requireRole, requireUser } from "@/lib/dal";
import { Role } from "@/lib/generated/prisma/enums";
import { BotTestClient } from "@/components/staff/bot-test-client";

export default async function BotTestPage() {
  await requireRole([Role.ADMIN]);
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Test & Diagnostics du Bot Discord</h1>
        <p className="text-muted-foreground text-sm">
          Cet outil vous permet de tester en conditions réelles les interactions avec HyoriBot :
          envoi de messages privés lors des changements de statut et attribution de rôles Discord.
        </p>
      </div>

      <BotTestClient
        currentDiscordId={user.discordId}
        currentDiscordUsername={user.discordDisplayName || user.discordUsername}
      />
    </div>
  );
}

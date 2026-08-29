import { redirect } from "next/navigation";
import { getPlayerState } from "@/lib/dal";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";

export default async function PlayerIndexPage() {
  const user = await getPlayerState();
  if (user.registrationStatus === RegistrationStatus.REJECTED) {
    redirect("/player/rejection");
  }
  if (user.registrationStatus === RegistrationStatus.WHITELISTED) {
    redirect("/player/character-sheet");
  }
  redirect("/player/getting-started");
}

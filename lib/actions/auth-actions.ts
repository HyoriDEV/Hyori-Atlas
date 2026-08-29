"use server";

import { revalidatePath } from "next/cache";

import { auth, signIn, signOut } from "@/auth";
import { syncDiscordUser } from "@/lib/services/discord-sync";

export async function signInWithDiscord(callbackUrl: string = "/player") {
  await signIn("discord", { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function refreshDiscordProfileAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non connecté" };
  }

  const result = await syncDiscordUser(session.user.id);
  if (result.success) {
    revalidatePath("/", "layout");
  }

  return result;
}

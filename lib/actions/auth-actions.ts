"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithDiscord(callbackUrl: string = "/player") {
  await signIn("discord", { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

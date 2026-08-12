"use server";

import { signIn } from "@/auth";
import { isDevAuthEnabled } from "@/lib/dev-auth";

export async function devSignInAction(userId: string, redirectTo: string = "/player") {
  if (!isDevAuthEnabled()) {
    throw new Error("Dev auth is disabled");
  }

  await signIn("dev-login", { userId, redirectTo });
}

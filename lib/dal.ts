import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, type Role } from "@/lib/generated/prisma/enums";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    return null;
  }

  if (dbUser.registrationStatus === RegistrationStatus.NEW && dbUser.minecraftUuid) {
    const [promoted] = await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: { registrationStatus: RegistrationStatus.WAITLIST },
      }),
      prisma.registrationStatusHistory.create({
        data: {
          userId: dbUser.id,
          status: RegistrationStatus.WAITLIST,
        },
      }),
    ]);
    return { ...session.user, ...promoted };
  }

  return { ...session.user, ...dbUser };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/api/auth/signin?callbackUrl=/player");
  }
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/player");
  }
  return user;
}

export const getPlayerState = cache(async () => {
  return requireUser();
});

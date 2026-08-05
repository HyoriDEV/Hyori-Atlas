import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import type { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      registrationStatus: RegistrationStatus;
      minecraftUuid: string | null;
      minecraftUsername: string | null;
      discordUsername: string;
      discordAvatarUrl: string | null;
    } & DefaultSession["user"];
  }
}

interface AppTokenFields {
  userId?: string;
  role?: Role;
  registrationStatus?: RegistrationStatus;
  minecraftUuid?: string | null;
  minecraftUsername?: string | null;
  discordUsername?: string;
  discordAvatarUrl?: string | null;
}

interface DiscordProfile {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
  email: string | null;
}

function buildDiscordAvatarUrl(profile: DiscordProfile) {
  if (!profile.avatar) {
    const defaultAvatarNumber =
      profile.discriminator === "0"
        ? Number(BigInt(profile.id) >> BigInt(22)) % 6
        : parseInt(profile.discriminator, 10) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }

  const format = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      profile(profile: DiscordProfile) {
        const avatarUrl = buildDiscordAvatarUrl(profile);
        const displayName = profile.global_name ?? profile.username;

        return {
          id: profile.id,
          discordId: profile.id,
          discordUsername: profile.username,
          discordDisplayName: displayName,
          discordAvatarUrl: avatarUrl,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.registrationStatusHistory.create({
          data: {
            userId: user.id,
            status: "NEW",
          },
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      const appToken = token as typeof token & AppTokenFields;

      if (user) {
        appToken.userId = user.id;
      }

      if (trigger === "signIn" || trigger === "signUp" || !appToken.role) {
        const dbUser = appToken.userId
          ? await prisma.user.findUnique({
              where: { id: appToken.userId },
              select: {
                role: true,
                registrationStatus: true,
                minecraftUuid: true,
                minecraftUsername: true,
                discordUsername: true,
                discordAvatarUrl: true,
              },
            })
          : null;

        if (dbUser) {
          appToken.role = dbUser.role;
          appToken.registrationStatus = dbUser.registrationStatus;
          appToken.minecraftUuid = dbUser.minecraftUuid;
          appToken.minecraftUsername = dbUser.minecraftUsername;
          appToken.discordUsername = dbUser.discordUsername;
          appToken.discordAvatarUrl = dbUser.discordAvatarUrl;
        }
      }

      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as typeof token & AppTokenFields;

      if (appToken.userId) session.user.id = appToken.userId;
      if (appToken.role) session.user.role = appToken.role;
      if (appToken.registrationStatus)
        session.user.registrationStatus = appToken.registrationStatus;
      session.user.minecraftUuid = appToken.minecraftUuid ?? null;
      session.user.minecraftUsername = appToken.minecraftUsername ?? null;
      if (appToken.discordUsername) session.user.discordUsername = appToken.discordUsername;
      session.user.discordAvatarUrl = appToken.discordAvatarUrl ?? null;
      return session;
    },
  },
});


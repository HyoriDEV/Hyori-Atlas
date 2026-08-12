import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";

import { prisma } from "@/lib/prisma";
import { isDevAuthEnabled } from "@/lib/dev-auth";
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

const adapter: Adapter = {
  async createUser(rawUser) {
    const user = rawUser as Partial<AdapterUser> & {
      discordId: string;
      discordUsername: string;
      discordDisplayName: string;
      discordAvatarUrl?: string | null;
    };

    const createdUser = await prisma.user.create({
      data: {
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordDisplayName: user.discordDisplayName,
        discordAvatarUrl: user.discordAvatarUrl ?? null,
      },
    });

    return createdUser as unknown as AdapterUser;
  },

  async getUser(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    return (user as unknown as AdapterUser) ?? null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: { user: true },
    });

    return (account?.user as unknown as AdapterUser) ?? null;
  },

  async updateUser(rawUser) {
    const { id, ...data } = rawUser;
    const user = data as Partial<{
      discordId: string;
      discordUsername: string;
      discordDisplayName: string;
      discordAvatarUrl: string | null;
      role: Role;
      registrationStatus: RegistrationStatus;
      minecraftUuid: string | null;
      minecraftUsername: string | null;
    }>;

    const updateData: Record<string, unknown> = {};
    if (user.discordId !== undefined) updateData.discordId = user.discordId;
    if (user.discordUsername !== undefined) updateData.discordUsername = user.discordUsername;
    if (user.discordDisplayName !== undefined) updateData.discordDisplayName = user.discordDisplayName;
    if (user.discordAvatarUrl !== undefined) updateData.discordAvatarUrl = user.discordAvatarUrl;
    if (user.role !== undefined) updateData.role = user.role;
    if (user.registrationStatus !== undefined) updateData.registrationStatus = user.registrationStatus;
    if (user.minecraftUuid !== undefined) updateData.minecraftUuid = user.minecraftUuid;
    if (user.minecraftUsername !== undefined) updateData.minecraftUsername = user.minecraftUsername;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return updatedUser as unknown as AdapterUser;
  },

  async deleteUser(id) {
    await prisma.user.delete({ where: { id } });
  },

  async linkAccount(account) {
    await prisma.account.create({
      data: {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: typeof account.session_state === "string" ? account.session_state : null,
        refresh_token_expires_in:
          typeof (account as Record<string, unknown>).refresh_token_expires_in === "number"
            ? ((account as Record<string, unknown>).refresh_token_expires_in as number)
            : null,
      },
    });

    return account as AdapterAccount;
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await prisma.account.delete({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    ...(isDevAuthEnabled()
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev Login",
            credentials: {
              userId: { label: "User ID", type: "text" },
            },
            async authorize(credentials) {
              if (!isDevAuthEnabled() || !credentials?.userId) {
                return null;
              }

              const dbUser = await prisma.user.findUnique({
                where: { id: credentials.userId as string },
              });

              if (!dbUser) {
                return null;
              }

              return {
                id: dbUser.id,
                discordId: dbUser.discordId,
                discordUsername: dbUser.discordUsername,
                discordDisplayName: dbUser.discordDisplayName,
                discordAvatarUrl: dbUser.discordAvatarUrl,
              };
            },
          }),
        ]
      : []),
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


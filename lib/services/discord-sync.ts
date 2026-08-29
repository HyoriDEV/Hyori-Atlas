import { prisma } from "@/lib/prisma";

export interface DiscordProfileData {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
  discriminator?: string;
}

export function buildDiscordAvatarUrl(profile: {
  id: string;
  avatar: string | null;
  discriminator?: string;
}): string {
  if (!profile.avatar) {
    const defaultAvatarNumber =
      profile.discriminator === "0" || !profile.discriminator
        ? Number(BigInt(profile.id) >> BigInt(22)) % 6
        : parseInt(profile.discriminator, 10) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }

  const format = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function refreshDiscordAccessToken(
  refreshToken: string
): Promise<DiscordTokenResponse | null> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to refresh Discord access token", await response.text());
      return null;
    }

    return (await response.json()) as DiscordTokenResponse;
  } catch (error) {
    console.error("Error refreshing Discord access token:", error);
    return null;
  }
}

export async function fetchDiscordProfileFromApi(
  discordId: string,
  accessToken?: string | null,
  refreshToken?: string | null,
  accountId?: string
): Promise<DiscordProfileData | null> {
  // 1. Try with Bot token if available
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken) {
    try {
      const response = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        return (await response.json()) as DiscordProfileData;
      }
    } catch (error) {
      console.warn("Failed to fetch Discord profile with bot token:", error);
    }
  }

  // 2. Try with user access token
  if (accessToken) {
    try {
      let currentAccessToken = accessToken;
      let response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${currentAccessToken}`,
        },
        cache: "no-store",
      });

      // If token expired and we have a refresh token, try refreshing
      if (response.status === 401 && refreshToken) {
        const refreshed = await refreshDiscordAccessToken(refreshToken);
        if (refreshed) {
          currentAccessToken = refreshed.access_token;
          if (accountId) {
            await prisma.account.update({
              where: { id: accountId },
              data: {
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
                token_type: refreshed.token_type,
                scope: refreshed.scope,
              },
            });
          }

          response = await fetch("https://discord.com/api/v10/users/@me", {
            headers: {
              Authorization: `Bearer ${currentAccessToken}`,
            },
            cache: "no-store",
          });
        }
      }

      if (response.ok) {
        return (await response.json()) as DiscordProfileData;
      }
    } catch (error) {
      console.error("Failed to fetch Discord profile with user access token:", error);
    }
  }

  return null;
}

export async function syncDiscordUser(userId: string): Promise<{
  success: boolean;
  avatarUrl?: string | null;
  username?: string;
  displayName?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        where: { provider: "discord" },
        take: 1,
      },
    },
  });

  if (!user) {
    return { success: false };
  }

  const discordAccount = user.accounts[0] ?? null;
  const profile = await fetchDiscordProfileFromApi(
    user.discordId,
    discordAccount?.access_token,
    discordAccount?.refresh_token,
    discordAccount?.id
  );

  if (!profile) {
    return { success: false };
  }

  const avatarUrl = buildDiscordAvatarUrl(profile);
  const displayName = profile.global_name ?? profile.username;

  await prisma.user.update({
    where: { id: userId },
    data: {
      discordAvatarUrl: avatarUrl,
      discordUsername: profile.username,
      discordDisplayName: displayName,
    },
  });

  return {
    success: true,
    avatarUrl,
    username: profile.username,
    displayName,
  };
}

const SYNC_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

export async function syncDiscordUserIfNeeded(userId: string, lastUpdatedAt?: Date): Promise<void> {
  if (lastUpdatedAt && Date.now() - lastUpdatedAt.getTime() < SYNC_THROTTLE_MS) {
    return;
  }

  try {
    await syncDiscordUser(userId);
  } catch (error) {
    console.warn("Automatic Discord sync failed:", error);
  }
}

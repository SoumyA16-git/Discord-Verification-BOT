import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface DiscordUserIdentity {
  id: string;
  username: string;
  avatar: string | null;
}

export interface DiscordUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export function getDiscordAuthorizeUrl(state: string, redirectUri?: string): string {
  const env = getEnv();
  const uri = redirectUri || env.DISCORD_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: uri,
    response_type: 'code',
    scope: 'identify',
    state,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<{ accessToken: string; tokenType: string }> {
  const env = getEnv();
  const uri = redirectUri || env.DISCORD_REDIRECT_URI;

  const tokenParams = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: uri,
  });

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    logger.warn({ status: tokenResponse.status, errorText }, 'Discord OAuth2 token exchange failed');
    throw new Error(`Discord OAuth2 token exchange failed: HTTP ${tokenResponse.status}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string; token_type: string };
  if (!tokenData.access_token) {
    throw new Error('No access_token returned by Discord OAuth2 endpoint');
  }

  return {
    accessToken: tokenData.access_token,
    tokenType: tokenData.token_type || 'Bearer',
  };
}

export async function fetchDiscordUserProfile(accessToken: string): Promise<DiscordUserIdentity> {
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch Discord user profile: HTTP ${userResponse.status}`);
  }

  const userData = (await userResponse.json()) as { id: string; username: string; avatar: string | null };
  if (!userData.id) {
    throw new Error('Discord user profile missing canonical snowflake ID');
  }

  return {
    id: userData.id,
    username: userData.username || 'Discord User',
    avatar: userData.avatar || null,
  };
}

export async function fetchDiscordUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
  const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!guildsResponse.ok) {
    logger.warn({ status: guildsResponse.status }, 'Failed fetching user guilds from Discord');
    return [];
  }

  return (await guildsResponse.json()) as DiscordUserGuild[];
}

export async function exchangeCodeForUser(
  code: string,
  redirectUri?: string
): Promise<DiscordUserIdentity> {
  const { accessToken } = await exchangeCodeForTokens(code, redirectUri);
  return fetchDiscordUserProfile(accessToken);
}

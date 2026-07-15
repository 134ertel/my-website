import { siteUrl } from "../site-url";
import { google } from "googleapis";
import fs from "node:fs";

/**
 * Real YouTube Shorts posting via googleapis. Requires a Google Cloud OAuth client
 * (GOOGLE_YT_CLIENT_ID / GOOGLE_YT_CLIENT_SECRET) with the YouTube Data API v3 enabled,
 * and the app must be verified for the `youtube.upload` scope for external users.
 */

const REDIRECT_PATH = "/api/social/youtube/callback";

export function isYoutubeConfigured() {
  return Boolean(process.env.GOOGLE_YT_CLIENT_ID && process.env.GOOGLE_YT_CLIENT_SECRET);
}

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_YT_CLIENT_ID,
    process.env.GOOGLE_YT_CLIENT_SECRET,
    `${siteUrl()}${REDIRECT_PATH}`,
  );
}

export function getYoutubeAuthUrl(state: string) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    state,
  });
}

export async function exchangeYoutubeCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const youtube = google.youtube({ version: "v3", auth: client });
  const channelRes = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = channelRes.data.items?.[0];
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? "",
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    accountName: channel?.snippet?.title ?? "YouTube Channel",
    avatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null,
    externalAccountId: channel?.id ?? "",
  };
}

export async function uploadYoutubeShort(opts: {
  refreshToken: string;
  filePath: string;
  title: string;
  description: string;
  tags: string[];
}) {
  const client = oauthClient();
  client.setCredentials({ refresh_token: opts.refreshToken });
  const youtube = google.youtube({ version: "v3", auth: client });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: opts.title.slice(0, 100),
        description: `${opts.description}\n\n${opts.tags.map((t) => `#${t}`).join(" ")}\n\n#Shorts`,
        tags: opts.tags,
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(opts.filePath) },
  });

  return { externalPostId: res.data.id ?? "" };
}

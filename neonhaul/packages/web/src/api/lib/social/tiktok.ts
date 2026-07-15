import { siteUrl } from "../site-url";
import fs from "node:fs";

/**
 * Real TikTok posting via TikTok's Content Posting API (v2). Requires a TikTok developer app
 * (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET) registered at developers.tiktok.com, with the
 * "Content Posting API" product added and reviewed. Unaudited apps can only post to the
 * authorizing user's account with limited scopes.
 */

const REDIRECT_PATH = "/api/social/tiktok/callback";

export function isTiktokConfigured() {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function getTiktokAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
    scope: "user.info.basic,video.publish,video.upload",
    response_type: "code",
    redirect_uri: `${siteUrl()}${REDIRECT_PATH}`,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTiktokCode(code: string) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: `${siteUrl()}${REDIRECT_PATH}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${JSON.stringify(data)}`);

  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userData = await userRes.json();
  const user = userData.data?.user;

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 0) * 1000),
    accountName: user?.display_name ?? "TikTok Account",
    avatarUrl: user?.avatar_url ?? null,
    externalAccountId: user?.open_id ?? "",
  };
}

export async function postTiktokVideo(opts: { accessToken: string; filePath: string; title: string }) {
  const stat = fs.statSync(opts.filePath);

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: { title: opts.title.slice(0, 150), privacy_level: "SELF_ONLY", disable_duet: false, disable_comment: false, disable_stitch: false },
      source_info: { source: "FILE_UPLOAD", video_size: stat.size, chunk_size: stat.size, total_chunk_count: 1 },
    }),
  });
  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(`TikTok init failed: ${JSON.stringify(initData)}`);

  const uploadUrl = initData.data.upload_url;
  const buf = fs.readFileSync(opts.filePath);
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${stat.size - 1}/${stat.size}` },
    body: buf,
  });

  return { externalPostId: initData.data.publish_id as string };
}

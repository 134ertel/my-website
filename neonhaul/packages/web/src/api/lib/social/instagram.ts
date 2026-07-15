import { siteUrl } from "../site-url";
/**
 * Real Instagram Reels posting via the Instagram Graph API. Requires a Meta developer app
 * (META_APP_ID / META_APP_SECRET) with Instagram Graph API access, the connected account must
 * be an Instagram Business or Creator account linked to a Facebook Page, and the app needs
 * `instagram_content_publish` permission approved by Meta App Review for use beyond your own
 * test accounts.
 */

const REDIRECT_PATH = "/api/social/instagram/callback";

export function isInstagramConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function getInstagramAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: `${siteUrl()}${REDIRECT_PATH}`,
    scope: "instagram_basic,instagram_content_publish,pages_show_list,business_management",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string) {
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID ?? "",
        client_secret: process.env.META_APP_SECRET ?? "",
        redirect_uri: `${siteUrl()}${REDIRECT_PATH}`,
        code,
      }),
  );
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Instagram token exchange failed: ${JSON.stringify(tokenData)}`);

  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${tokenData.access_token}`,
  );
  const pagesData = await pagesRes.json();
  const page = pagesData.data?.find((p: { instagram_business_account?: unknown }) => p.instagram_business_account);
  if (!page) throw new Error("No Instagram Business account linked to any of your Facebook Pages.");

  return {
    accessToken: page.access_token as string,
    refreshToken: "",
    expiresAt: null,
    accountName: page.name as string,
    avatarUrl: null,
    externalAccountId: page.instagram_business_account.id as string,
  };
}

export async function postInstagramReel(opts: { accessToken: string; igUserId: string; videoUrl: string; caption: string }) {
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: opts.videoUrl,
      caption: opts.caption,
      access_token: opts.accessToken,
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`Instagram media create failed: ${JSON.stringify(createData)}`);

  const containerId = createData.id;
  // Poll until the container is ready to publish.
  for (let i = 0; i < 20; i++) {
    const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code&access_token=${opts.accessToken}`);
    const statusData = await statusRes.json();
    if (statusData.status_code === "FINISHED") break;
    await new Promise((r) => setTimeout(r, 3000));
  }

  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: opts.accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${JSON.stringify(publishData)}`);

  return { externalPostId: publishData.id as string };
}

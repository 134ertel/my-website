/** Returns WEBSITE_URL with any trailing slash stripped, so redirect URIs never end up with "//". */
export function siteUrl() {
  return (process.env.WEBSITE_URL ?? "").replace(/\/+$/, "");
}

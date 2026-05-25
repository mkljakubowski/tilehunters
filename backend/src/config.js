// Comma-separated Strava athlete IDs in STRAVA_WHITELIST env var.
// Empty or unset means everyone is allowed.
export const STRAVA_WHITELIST = process.env.STRAVA_WHITELIST
  ? process.env.STRAVA_WHITELIST.split(',').map((id) => Number(id.trim())).filter(Boolean)
  : [];

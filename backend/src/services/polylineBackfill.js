import pool from '../db.js';
import { getActivity, refreshToken } from './strava.js';
import { computeTilesForPolyline } from './tileComputer.js';

const ZOOM = 14;
// ~2 seconds between Strava requests keeps us well under the 200 req/15min limit
const REQUEST_DELAY_MS = 2000;
// How long to wait when there's no work before checking again
const IDLE_DELAY_MS = 60_000;

async function getValidAccessToken(userId) {
  const result = await pool.query(
    'SELECT access_token, refresh_token, token_expires_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new Error(`User ${userId} not found`);

  const user = result.rows[0];
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (user.token_expires_at < nowSeconds + 60) {
    const tokenData = await refreshToken(user.refresh_token);
    await pool.query(
      'UPDATE users SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE id = $4',
      [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, userId]
    );
    return tokenData.access_token;
  }

  return user.access_token;
}

async function processNextActivity() {
  // detail_polyline = '' means we already tried and got nothing; skip those
  const result = await pool.query(`
    SELECT id, strava_id, user_id, start_date
    FROM activities
    WHERE detail_polyline IS NULL
      AND summary_polyline IS NOT NULL
      AND summary_polyline != ''
    ORDER BY start_date DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) return false;

  const activity = result.rows[0];
  console.log(`[backfill] Fetching detail for activity ${activity.strava_id}`);

  try {
    const accessToken = await getValidAccessToken(activity.user_id);
    const detail = await getActivity(accessToken, activity.strava_id);
    const detailPolyline = detail.map?.polyline || '';

    // Store detail polyline; use empty string as sentinel when Strava returns none
    await pool.query(
      'UPDATE activities SET detail_polyline = $1 WHERE id = $2',
      [detailPolyline, activity.id]
    );

    if (!detailPolyline) {
      console.log(`[backfill] No detail polyline for activity ${activity.strava_id}, skipping tiles`);
      return true;
    }

    // Reprocess tiles from the higher-resolution polyline
    const tiles = computeTilesForPolyline(detailPolyline, ZOOM);
    for (const tile of tiles) {
      await pool.query(
        `INSERT INTO visited_tiles (user_id, x, y, zoom, first_visited_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, x, y, zoom) DO NOTHING`,
        [activity.user_id, tile.x, tile.y, ZOOM, activity.start_date]
      );
    }

    console.log(`[backfill] Activity ${activity.strava_id}: inserted up to ${tiles.length} tiles`);
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('[backfill] Strava rate limit hit, pausing for 15 minutes');
      await new Promise((r) => setTimeout(r, 15 * 60 * 1000));
    } else {
      console.error(`[backfill] Failed for activity ${activity.strava_id}:`, err.message);
    }
    // Leave detail_polyline as NULL so it will be retried
  }

  return true;
}

export function startPolylineBackfill() {
  async function loop() {
    while (true) {
      try {
        const hadWork = await processNextActivity();
        if (!hadWork) {
          console.log('[backfill] All detail polylines loaded, worker done.');
          return;
        }
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
      } catch (err) {
        console.error('[backfill] Unexpected error:', err.message);
        await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
      }
    }
  }

  loop();
  console.log('[backfill] Polyline backfill worker started');
}

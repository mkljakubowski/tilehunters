import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getActivities, getActivity, refreshToken } from '../services/strava.js';
import { computeTilesForPolyline } from '../services/tileComputer.js';
import polyline from '@mapbox/polyline';

const router = Router();

async function getValidAccessToken(userId) {
  const result = await pool.query(
    'SELECT access_token, refresh_token, token_expires_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new Error('User not found');

  const user = result.rows[0];
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (user.token_expires_at < nowSeconds + 60) {
    // Token expired or expiring soon — refresh
    const tokenData = await refreshToken(user.refresh_token);
    await pool.query(
      'UPDATE users SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE id = $4',
      [tokenData.access_token, tokenData.refresh_token, tokenData.expires_at, userId]
    );
    return tokenData.access_token;
  }

  return user.access_token;
}

// POST /api/activities/sync — sync all activities from Strava
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.session.userId);
    const userId = req.session.userId;

    let page = 1;
    const perPage = 50;
    let syncedCount = 0;
    let totalTiles = 0;
    const ZOOM = 14;

    while (true) {
      const activities = await getActivities(accessToken, page, perPage);
      if (!activities || activities.length === 0) break;

      for (const activity of activities) {
        const summaryPolylineStr = activity.map?.summary_polyline || '';

        // Insert activity (skip if already exists)
        const insertResult = await pool.query(
          `INSERT INTO activities (user_id, strava_id, name, sport_type, start_date, distance, moving_time, summary_polyline)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (strava_id) DO NOTHING
           RETURNING id`,
          [
            userId,
            activity.id,
            activity.name,
            activity.sport_type || activity.type,
            activity.start_date,
            activity.distance,
            activity.moving_time,
            summaryPolylineStr,
          ]
        );

        const isNew = insertResult.rows.length > 0;
        if (isNew) {
          syncedCount++;
        }

        // For new activities, fetch full detail to get high-resolution polyline
        let polylineStr = summaryPolylineStr;
        if (isNew && summaryPolylineStr) {
          try {
            const detail = await getActivity(accessToken, activity.id);
            const detailPolyline = detail.map?.polyline || '';
            if (detailPolyline) {
              polylineStr = detailPolyline;
              await pool.query(
                'UPDATE activities SET detail_polyline = $1 WHERE strava_id = $2',
                [detailPolyline, activity.id]
              );
            }
          } catch (err) {
            console.warn(`Failed to fetch detail for activity ${activity.id}:`, err.message);
          }
        } else if (!isNew) {
          const stored = await pool.query(
            `SELECT COALESCE(NULLIF(detail_polyline, ''), summary_polyline) AS polyline FROM activities WHERE strava_id = $1`,
            [activity.id]
          );
          if (stored.rows.length > 0 && stored.rows[0].polyline) {
            polylineStr = stored.rows[0].polyline;
          }
        }

        // Compute tiles for this activity
        if (polylineStr) {
          const tiles = computeTilesForPolyline(polylineStr, ZOOM);
          for (const tile of tiles) {
            await pool.query(
              `INSERT INTO visited_tiles (user_id, x, y, zoom, first_visited_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id, x, y, zoom) DO NOTHING`,
              [userId, tile.x, tile.y, ZOOM, activity.start_date]
            );
            totalTiles++;
          }
        }
      }

      if (activities.length < perPage) break;
      page++;
    }

    // Get actual tile count for user
    const tileCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM visited_tiles WHERE user_id = $1',
      [userId]
    );

    res.json({
      synced: syncedCount,
      tiles: parseInt(tileCountResult.rows[0].count),
    });
  } catch (err) {
    console.error('Sync error:', err.message);
    // Surface Strava API error message when available (e.g. rate limit, auth failure)
    const stravaMsg = err.response?.data?.message || err.response?.data?.error;
    const details = stravaMsg ? `Strava: ${stravaMsg}` : err.message;
    res.status(500).json({ error: 'Failed to sync activities', details });
  }
});

// GET /api/activities — list user's activities
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, strava_id, name, sport_type, start_date, distance, moving_time
       FROM activities
       WHERE user_id = $1
       ORDER BY start_date DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activities/polylines — return all decoded polylines for the user
router.get('/polylines', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(NULLIF(detail_polyline, ''), summary_polyline) AS polyline FROM activities
       WHERE user_id = $1 AND summary_polyline IS NOT NULL AND summary_polyline != ''
       ORDER BY start_date DESC`,
      [req.session.userId]
    );
    const decoded = result.rows.map((r) => polyline.decode(r.polyline));
    res.json(decoded);
  } catch (err) {
    console.error('Error fetching polylines:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activities/:id/polyline — return decoded polyline points
router.get('/:id/polyline', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(NULLIF(detail_polyline, ''), summary_polyline) AS polyline FROM activities WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const encodedPolyline = result.rows[0].polyline;
    if (!encodedPolyline) {
      return res.json([]);
    }

    const decoded = polyline.decode(encodedPolyline);
    res.json(decoded); // Array of [lat, lon]
  } catch (err) {
    console.error('Error fetching polyline:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

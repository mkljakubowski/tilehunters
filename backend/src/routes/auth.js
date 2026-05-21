import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuthUrl, exchangeCode } from '../services/strava.js';

const router = Router();

// GET /api/auth/strava — redirect to Strava OAuth
router.get('/strava', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// GET /api/auth/callback — handle Strava OAuth callback
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';

  if (error || !code) {
    return res.redirect(`${frontendUrl}/?error=access_denied`);
  }

  try {
    const tokenData = await exchangeCode(code);
    const { athlete, access_token, refresh_token, expires_at } = tokenData;

    // Upsert user
    const result = await pool.query(
      `INSERT INTO users (strava_id, username, firstname, lastname, profile_picture, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (strava_id) DO UPDATE SET
         username = EXCLUDED.username,
         firstname = EXCLUDED.firstname,
         lastname = EXCLUDED.lastname,
         profile_picture = EXCLUDED.profile_picture,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at
       RETURNING id`,
      [
        athlete.id,
        athlete.username,
        athlete.firstname,
        athlete.lastname,
        athlete.profile,
        access_token,
        refresh_token,
        expires_at,
      ]
    );

    req.session.userId = result.rows[0].id;
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
});

// GET /api/auth/me — return current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, strava_id, username, firstname, lastname, profile_picture, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout — destroy session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

export default router;

import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/tiles — return all visited tiles for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT x, y, zoom FROM visited_tiles WHERE user_id = $1 AND zoom = 14 ORDER BY id',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tiles:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tiles/stats — return tile count and activity count
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const tileResult = await pool.query(
      'SELECT COUNT(*) as count FROM visited_tiles WHERE user_id = $1',
      [req.session.userId]
    );
    const activityResult = await pool.query(
      'SELECT COUNT(*) as count FROM activities WHERE user_id = $1',
      [req.session.userId]
    );
    res.json({
      tiles: parseInt(tileResult.rows[0].count),
      activities: parseInt(activityResult.rows[0].count),
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

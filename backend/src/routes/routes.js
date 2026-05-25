import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/routes
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, points, created_at FROM routes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/routes
router.post('/', requireAuth, async (req, res) => {
  const { name, points } = req.body;
  if (!name || !points || !Array.isArray(points)) {
    return res.status(400).json({ error: 'name and points are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO routes (user_id, name, points) VALUES ($1, $2, $3) RETURNING id, name, points, created_at',
      [req.session.userId, name.trim(), JSON.stringify(points)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM routes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.session.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

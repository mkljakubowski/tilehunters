import pool from '../db.js';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        strava_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        firstname VARCHAR(255),
        lastname VARCHAR(255),
        profile_picture TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        strava_id BIGINT UNIQUE NOT NULL,
        name VARCHAR(500),
        sport_type VARCHAR(100),
        start_date TIMESTAMP,
        distance FLOAT,
        moving_time INTEGER,
        summary_polyline TEXT,
        synced_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS visited_tiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        zoom INTEGER NOT NULL DEFAULT 14,
        first_visited_at TIMESTAMP,
        UNIQUE(user_id, x, y, zoom)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visited_tiles_user ON visited_tiles(user_id, zoom);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
    `);

    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS detail_polyline TEXT;
    `);

    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS total_elevation_gain FLOAT;
    `);

    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS tile_count INTEGER;
    `);

    console.log('Migrations completed successfully');
  } finally {
    client.release();
  }
}

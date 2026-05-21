import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import pool from './db.js';
import { runMigrations } from './db/migrations.js';
import authRoutes from './routes/auth.js';
import activitiesRoutes from './routes/activities.js';
import tilesRoutes from './routes/tiles.js';

const app = express();
const PORT = process.env.PORT || 3000;
const PgSession = connectPgSimple(session);

// CORS — allow frontend origin with credentials
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
app.use(cors({
  origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session with PostgreSQL store
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'change_me_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
  },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tiles', tilesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`TileHunters backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

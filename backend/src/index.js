import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import pool from './db.js';
import { runMigrations } from './db/migrations.js';
import { startPolylineBackfill } from './services/polylineBackfill.js';
import authRoutes from './routes/auth.js';
import activitiesRoutes from './routes/activities.js';
import tilesRoutes from './routes/tiles.js';
import routesRoutes from './routes/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const PgSession = connectPgSimple(session);

// CORS — allow frontend origin with credentials
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [frontendUrl]
  : [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    secure: process.env.HTTPS === 'true',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
  },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tiles', tilesRoutes);
app.use('/api/routes', routesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend static files in production
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`TileHunters backend running on port ${PORT}`);
    });
    startPolylineBackfill();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

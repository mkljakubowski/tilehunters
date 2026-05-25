# TileHunters

TileHunters is a web application that lets you connect your Strava account and visualize which OSM map tiles (zoom level 14) you have covered with your GPS activities. Inspired by StatHunters, it renders your explored tiles as semi-transparent orange rectangles on an interactive Leaflet map.

## Features

- Strava OAuth login
- Sync all your Strava activities (runs, rides, hikes, etc.)
- Automatically computes every tile crossed by each GPS track using Bresenham-style grid traversal
- Interactive Leaflet map showing all visited tiles
- Click any activity in the sidebar to highlight its route on the map
- Stats panel showing total tiles explored and activity count

---

## Getting Strava API Credentials

1. Go to https://www.strava.com/settings/api and create a new application.
2. Set the **Authorization Callback Domain** to `localhost` (for local dev) or your production domain.
3. Note down your **Client ID** and **Client Secret**.

**Important callback URL:**
- Local Docker: `http://localhost/api/auth/callback`
- Local dev (backend direct): `http://localhost:3000/api/auth/callback`

You must register the exact callback URL in your Strava app settings.

---

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Set up the database

```bash
createdb tilehunters
createuser tilehunters
psql -c "ALTER USER tilehunters WITH PASSWORD 'tilehunters';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE tilehunters TO tilehunters;"
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Strava credentials
```

For local dev without Docker, also create `backend/.env`:

```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=some_random_string
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tilehunters
DB_USER=tilehunters
DB_PASSWORD=tilehunters
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
SESSION_SECRET=a_long_random_string_min_32_chars
FRONTEND_URL=http://localhost
STRAVA_REDIRECT_URI=http://localhost/api/auth/callback
```

### 2. Build and start

```bash
docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:3000

### 3. Stop

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

---

## Production Deployment

For production with a real domain (e.g., `https://tilehunters.example.com`):

1. Update `.env`:
   ```env
   FRONTEND_URL=https://tilehunters.example.com
   STRAVA_REDIRECT_URI=https://tilehunters.example.com/api/auth/callback
   SESSION_SECRET=<a strong random secret>
   ```
2. Add your domain to the Strava app's **Authorization Callback Domain**.
3. Put a TLS-terminating reverse proxy (nginx, Caddy, Traefik) in front of the Docker stack.
4. Set `secure: true` on the session cookie by adding `HTTPS=true` to the backend environment in `docker-compose.yml`.

---

## Project Structure

```
tilehunters/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express entry point
│   │   ├── db.js                 # PostgreSQL pool
│   │   ├── db/
│   │   │   └── migrations.js     # Schema creation
│   │   ├── middleware/
│   │   │   └── auth.js           # requireAuth middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # /api/auth/*
│   │   │   ├── activities.js     # /api/activities/*
│   │   │   └── tiles.js          # /api/tiles/*
│   │   └── services/
│   │       ├── strava.js         # Strava API client
│   │       └── tileComputer.js   # Tile rasterization
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/index.js          # Axios instance
│   │   ├── stores/user.js        # Pinia user store
│   │   ├── router/index.js       # Vue Router
│   │   ├── views/
│   │   │   ├── HomeView.vue      # Landing page
│   │   │   └── DashboardView.vue # Main dashboard
│   │   └── components/
│   │       ├── MapView.vue       # Leaflet map
│   │       ├── ActivityList.vue  # Activity sidebar list
│   │       └── StatsPanel.vue    # Stats + user info
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## How Tile Computation Works

1. Each Strava activity has a `summary_polyline` (encoded as a Google polyline).
2. The polyline is decoded into a sequence of lat/lon points.
3. For each consecutive pair of points, both endpoints are converted to tile coordinates at zoom 14 using the OSM slippy map formula.
4. All tiles between the two tile coordinates are found using Bresenham's line algorithm on the tile grid.
5. Unique tile coordinates are upserted into the `visited_tiles` table.

Zoom level 14 tiles are roughly 2.4 km × 1.5 km at mid-latitudes — small enough to be meaningful for local exploration.

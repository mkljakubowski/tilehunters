<template>
  <div ref="mapContainer" class="map-container">
    <div class="map-control">
      <div class="control-section">
        <span class="control-label">Map</span>
        <div class="map-type-buttons">
          <button
            v-for="mt in mapTypes"
            :key="mt.id"
            :class="['map-type-btn', { active: mapType === mt.id }]"
            @click="setMapType(mt.id)"
          >{{ mt.label }}</button>
        </div>
      </div>
      <div class="control-divider" />
      <label class="control-toggle">
        <input type="checkbox" v-model="showRoute" />
        Route
      </label>
      <div class="control-divider" />
      <button class="gpx-btn" @click="$refs.gpxInput.click()">GPX</button>
      <button v-if="gpxLayer" class="gpx-clear-btn" @click="clearGpx" title="Clear GPX">✕</button>
      <input ref="gpxInput" type="file" accept=".gpx" class="gpx-file-input" @change="onGpxFile" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { computeBiggestSquare } from '../utils/tileStats.js';

const props = defineProps({
  tiles: {
    type: Array,
    default: () => [],
  },
  allPolylines: {
    type: Array,
    default: () => [],
  },
  selectedActivityPolyline: {
    type: Array,
    default: null,
  },
});

const emit = defineEmits(['tileClick', 'activityClick']);

const mapContainer = ref(null);
const mapType = ref('dark');
const showRoute = ref(true);
const gpxLayer = ref(null);

const mapTypes = [
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
];

const TILE_ZOOM = 14;
const UNVISITED_MIN_MAP_ZOOM = 10;
const UNVISITED_MAX_TILES = 5000;

let map = null;
let tileLayer = null;
let unvisitedLayerGroup = null;
let tilesLayerGroup = null;
let allRoutesLayerGroup = null;
let activityPolylineLayer = null;
let gpxPreviewLayerGroup = null;
let visitedSet = new Set();
let biggestSquareSet = new Set();

function latLonToTile(lat, lon, zoom) {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2 * Math.pow(2, zoom)
  );
  return { x, y };
}

function tileToLatLon(x, y, zoom) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return {
    lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lon: x / Math.pow(2, zoom) * 360 - 180,
  };
}

function getTileBounds(x, y, zoom) {
  const nw = tileToLatLon(x, y, zoom);
  const se = tileToLatLon(x + 1, y + 1, zoom);
  return [[nw.lat, nw.lon], [se.lat, se.lon]];
}

function drawUnvisitedTiles() {
  unvisitedLayerGroup.clearLayers();
  if (!map || map.getZoom() < UNVISITED_MIN_MAP_ZOOM) return;

  const bounds = map.getBounds();
  const nw = latLonToTile(bounds.getNorth(), bounds.getWest(), TILE_ZOOM);
  const se = latLonToTile(bounds.getSouth(), bounds.getEast(), TILE_ZOOM);

  const count = (se.x - nw.x + 1) * (se.y - nw.y + 1);
  if (count > UNVISITED_MAX_TILES) return;

  const renderer = L.canvas({ padding: 0.5 });
  const style = {
    color: '#ffffff',
    weight: 0.5,
    opacity: 0.15,
    fillColor: '#ffffff',
    fillOpacity: 0.04,
    interactive: false,
    renderer,
  };

  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      if (!visitedSet.has(`${x},${y}`)) {
        L.rectangle(getTileBounds(x, y, TILE_ZOOM), style).addTo(unvisitedLayerGroup);
      }
    }
  }
}

function setMapType(id) {
  mapType.value = id;
  if (!map) return;
  const mt = mapTypes.find((t) => t.id === id);
  if (tileLayer) {
    map.removeLayer(tileLayer);
  }
  tileLayer = L.tileLayer(mt.url, {
    attribution: mt.attribution,
    maxZoom: mt.maxZoom,
  });
  tileLayer.addTo(map);
  tileLayer.bringToBack();
}


function isEnclosed(x, y) {
  return (
    visitedSet.has(`${x},${y - 1}`) &&
    visitedSet.has(`${x},${y + 1}`) &&
    visitedSet.has(`${x - 1},${y}`) &&
    visitedSet.has(`${x + 1},${y}`)
  );
}

function drawTiles(tiles) {
  tilesLayerGroup.clearLayers();

  const renderer = L.canvas({ padding: 0.5 });

  for (const tile of tiles) {
    const key = `${tile.x},${tile.y}`;
    const inSquare = biggestSquareSet.has(key);
    const enclosed = !inSquare && isEnclosed(tile.x, tile.y);
    const color      = inSquare ? '#3b82f6' : enclosed ? '#22c55e' : '#FF6B35';
    const fillColor  = inSquare ? 'rgba(59, 130, 246, 0.35)' : enclosed ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255, 165, 0, 0.35)';
    const bounds = getTileBounds(tile.x, tile.y, tile.zoom || TILE_ZOOM);
    const rect = L.rectangle(bounds, {
      color,
      weight: 1,
      fillColor,
      fillOpacity: 0.35,
      opacity: 0.7,
      renderer,
    });

    rect.on('click', () => {
      emit('tileClick', tile);
    });

    tilesLayerGroup.addLayer(rect);
  }
}

function drawAllRoutes(polylines) {
  allRoutesLayerGroup.clearLayers();
  if (!showRoute.value || !polylines || polylines.length === 0) return;

  for (const { id, points } of polylines) {
    if (!points || points.length === 0) continue;
    L.polyline(points, {
      color: '#93c5fd',
      weight: 3,
      opacity: 0.4,
      lineJoin: 'round',
      interactive: true,
    })
      .on('click', () => emit('activityClick', id))
      .addTo(allRoutesLayerGroup);
  }
}

function drawSelectedRoute(latLons) {
  if (activityPolylineLayer) {
    activityPolylineLayer.remove();
    activityPolylineLayer = null;
  }
  if (!latLons || latLons.length === 0) return;

  activityPolylineLayer = L.polyline(latLons, {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.9,
    lineJoin: 'round',
  }).addTo(map);

  map.fitBounds(activityPolylineLayer.getBounds(), { padding: [40, 40] });
}

function haversineMeters(lat0, lon0, lat1, lon1) {
  const R = 6371000;
  const dLat = (lat1 - lat0) * Math.PI / 180;
  const dLon = (lon1 - lon0) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat0 * Math.PI / 180) * Math.cos(lat1 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function computeNewTilesForTracks(tracks) {
  const STEP = 50;
  const newTiles = [];

  for (const points of tracks) {
    for (let i = 0; i < points.length; i++) {
      const [lat, lon] = points[i];
      const t = latLonToTile(lat, lon, TILE_ZOOM);
      const key = `${t.x},${t.y}`;
      if (!visitedSet.has(key)) newTiles.push({ x: t.x, y: t.y, _key: key });

      if (i === 0) continue;
      const [pLat, pLon] = points[i - 1];
      const steps = Math.max(1, Math.ceil(haversineMeters(pLat, pLon, lat, lon) / STEP));
      for (let s = 1; s < steps; s++) {
        const frac = s / steps;
        const it = latLonToTile(pLat + frac * (lat - pLat), pLon + frac * (lon - pLon), TILE_ZOOM);
        const k = `${it.x},${it.y}`;
        if (!visitedSet.has(k)) newTiles.push({ x: it.x, y: it.y, _key: k });
      }
    }
  }

  // deduplicate by key
  const seen = new Set();
  return newTiles.filter(({ _key }) => seen.has(_key) ? false : seen.add(_key));
}

function drawGpxPreview(tracks) {
  gpxPreviewLayerGroup.clearLayers();
  const newTiles = computeNewTilesForTracks(tracks);
  if (newTiles.length === 0) return;

  const renderer = L.canvas({ padding: 0.5 });
  for (const tile of newTiles) {
    L.rectangle(getTileBounds(tile.x, tile.y, TILE_ZOOM), {
      color: '#fde047',
      weight: 1,
      opacity: 0.6,
      fillColor: '#fde047',
      fillOpacity: 0.2,
      interactive: false,
      renderer,
    }).addTo(gpxPreviewLayerGroup);
  }
}

function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const ns = doc.documentElement.namespaceURI || '';

  const getAttr = (el, attr) => parseFloat(el.getAttribute(attr));

  const pointsFromElements = (tagName) =>
    [...doc.getElementsByTagNameNS(ns, tagName),
     ...doc.getElementsByTagName(tagName)]
      .filter((el, i, arr) => arr.indexOf(el) === i) // deduplicate
      .map((pt) => [getAttr(pt, 'lat'), getAttr(pt, 'lon')])
      .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon));

  // Collect track segments and route points
  const tracks = [];
  for (const seg of [...doc.getElementsByTagNameNS(ns, 'trkseg'), ...doc.getElementsByTagName('trkseg')]) {
    const pts = [...seg.getElementsByTagNameNS(ns, 'trkpt'), ...seg.getElementsByTagName('trkpt')]
      .filter((el, i, arr) => arr.indexOf(el) === i)
      .map((pt) => [getAttr(pt, 'lat'), getAttr(pt, 'lon')])
      .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon));
    if (pts.length > 0) tracks.push(pts);
  }

  const routePts = pointsFromElements('rtept');
  if (routePts.length > 0) tracks.push(routePts);

  return tracks;
}

function clearGpx() {
  if (gpxLayer.value) {
    gpxLayer.value.remove();
    gpxLayer.value = null;
  }
  gpxPreviewLayerGroup?.clearLayers();
}

function onGpxFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = (e) => {
    const tracks = parseGpx(e.target.result);
    if (!tracks.length) return;

    clearGpx();

    const group = L.layerGroup().addTo(map);
    for (const pts of tracks) {
      L.polyline(pts, {
        color: '#facc15',
        weight: 3,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(group);
    }
    gpxLayer.value = group;
    drawGpxPreview(tracks);

    // Zoom to the GPX track
    const allPts = tracks.flat();
    if (allPts.length > 0) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [40, 40] });
    }
  };
  reader.readAsText(file);
}

onMounted(() => {
  map = L.map(mapContainer.value, {
    center: [47.3769, 8.5417],
    zoom: 10,
    zoomControl: true,
  });

  const initial = mapTypes.find((mt) => mt.id === mapType.value);
  tileLayer = L.tileLayer(initial.url, {
    attribution: initial.attribution,
    maxZoom: initial.maxZoom,
  }).addTo(map);

  unvisitedLayerGroup = L.layerGroup().addTo(map);
  tilesLayerGroup = L.layerGroup().addTo(map);
  allRoutesLayerGroup = L.layerGroup().addTo(map);
  gpxPreviewLayerGroup = L.layerGroup().addTo(map);

  map.on('moveend zoomend', drawUnvisitedTiles);

  if (props.tiles.length > 0) {
    visitedSet = new Set(props.tiles.map((t) => `${t.x},${t.y}`));
    biggestSquareSet = computeBiggestSquare(props.tiles).set;
    drawTiles(props.tiles);
    drawUnvisitedTiles();
  }

  drawAllRoutes(props.allPolylines);
});

onBeforeUnmount(() => {
  if (map) {
    map.off('moveend zoomend', drawUnvisitedTiles);
    map.remove();
    map = null;
  }
});

watch(
  () => props.tiles,
  (newTiles) => {
    visitedSet = new Set(newTiles.map((t) => `${t.x},${t.y}`));
    biggestSquareSet = computeBiggestSquare(newTiles).set;

    if (map && tilesLayerGroup) {
      drawTiles(newTiles);
      drawUnvisitedTiles();

      if (newTiles.length > 0) {
        const bounds = newTiles.map((t) => getTileBounds(t.x, t.y, t.zoom || TILE_ZOOM));
        const allBounds = bounds.reduce(
          (acc, b) => acc.extend(b),
          L.latLngBounds(bounds[0])
        );
        map.fitBounds(allBounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
  },
  { deep: false }
);

watch(
  () => props.allPolylines,
  (polylines) => {
    if (map) drawAllRoutes(polylines);
  }
);

watch(
  () => props.selectedActivityPolyline,
  (latLons) => {
    if (map) drawSelectedRoute(latLons);
  }
);

watch(showRoute, (val) => {
  if (!map) return;
  if (val) {
    drawAllRoutes(props.allPolylines);
  } else {
    allRoutesLayerGroup.clearLayers();
  }
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-control {
  position: absolute;
  bottom: 2rem;
  right: 0.75rem;
  z-index: 1000;
  background: rgba(17, 24, 39, 0.88);
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8rem;
  color: #e5e7eb;
  backdrop-filter: blur(6px);
  user-select: none;
}

.control-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-label {
  color: #9ca3af;
  white-space: nowrap;
}

.map-type-buttons {
  display: flex;
  gap: 0.25rem;
}

.map-type-btn {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #d1d5db;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.map-type-btn:hover {
  background: #374151;
  color: #f3f4f6;
}

.map-type-btn.active {
  background: #FF6B35;
  border-color: #FF6B35;
  color: #fff;
}

.control-divider {
  width: 1px;
  height: 1.25rem;
  background: #374151;
}

.control-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}

.control-toggle input[type="checkbox"] {
  accent-color: #FF6B35;
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.gpx-file-input {
  display: none;
}

.gpx-btn {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #d1d5db;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.gpx-btn:hover {
  background: #374151;
  color: #f3f4f6;
}

.gpx-clear-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.1rem 0.2rem;
  line-height: 1;
  transition: color 0.15s;
}

.gpx-clear-btn:hover {
  color: #f87171;
}
</style>

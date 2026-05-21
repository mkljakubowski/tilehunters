<template>
  <div ref="mapContainer" class="map-container">
    <div class="grid-control">
      <label class="grid-toggle">
        <input type="checkbox" v-model="showGrid" @change="drawGrid" />
        Grid
      </label>
      <div v-if="showGrid" class="grid-size">
        <input
          type="number"
          v-model.number="gridSizeKm"
          min="0.1"
          max="100"
          step="0.1"
          @change="drawGrid"
        />
        <span>km</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  tiles: {
    type: Array,
    default: () => [],
  },
  selectedActivityPolyline: {
    type: Array,
    default: null,
  },
});

const emit = defineEmits(['tileClick']);

const mapContainer = ref(null);
const showGrid = ref(true);
const gridSizeKm = ref(1);

let map = null;
let tileLayer = null;
let tilesLayerGroup = null;
let gridLayerGroup = null;
let activityPolylineLayer = null;

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

function drawGrid() {
  gridLayerGroup.clearLayers();
  if (!showGrid.value || !map) return;

  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const stepLat = gridSizeKm.value / 111.32;
  const centerLat = (south + north) / 2;
  const stepLon = gridSizeKm.value / (111.32 * Math.cos(centerLat * Math.PI / 180));

  const latLines = Math.ceil((north - south) / stepLat);
  const lonLines = Math.ceil((east - west) / stepLon);

  if (latLines + lonLines > 400) return;

  const startLat = Math.floor(south / stepLat) * stepLat;
  const startLon = Math.floor(west / stepLon) * stepLon;

  const style = { color: '#ffffff', weight: 0.5, opacity: 0.2, interactive: false };

  for (let lat = startLat; lat <= north + stepLat; lat += stepLat) {
    L.polyline([[lat, west - stepLon], [lat, east + stepLon]], style).addTo(gridLayerGroup);
  }

  for (let lon = startLon; lon <= east + stepLon; lon += stepLon) {
    L.polyline([[south - stepLat, lon], [north + stepLat, lon]], style).addTo(gridLayerGroup);
  }
}

function drawTiles(tiles) {
  tilesLayerGroup.clearLayers();

  const renderer = L.canvas({ padding: 0.5 });

  for (const tile of tiles) {
    const bounds = getTileBounds(tile.x, tile.y, tile.zoom || 14);
    const rect = L.rectangle(bounds, {
      color: '#FF6B35',
      weight: 1,
      fillColor: 'rgba(255, 165, 0, 0.35)',
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

function drawActivityPolyline(latLons) {
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

onMounted(() => {
  map = L.map(mapContainer.value, {
    center: [51.505, -0.09],
    zoom: 6,
    zoomControl: true,
  });

  tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  tilesLayerGroup = L.layerGroup().addTo(map);
  gridLayerGroup = L.layerGroup().addTo(map);

  map.on('moveend zoomend', drawGrid);

  if (props.tiles.length > 0) {
    drawTiles(props.tiles);
  }

  drawGrid();
});

onBeforeUnmount(() => {
  if (map) {
    map.off('moveend zoomend', drawGrid);
    map.remove();
    map = null;
  }
});

watch(
  () => props.tiles,
  (newTiles) => {
    if (map && tilesLayerGroup) {
      drawTiles(newTiles);

      if (newTiles.length > 0) {
        const bounds = newTiles.map((t) => getTileBounds(t.x, t.y, t.zoom || 14));
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
  () => props.selectedActivityPolyline,
  (latLons) => {
    if (map) {
      drawActivityPolyline(latLons);
    }
  }
);
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.grid-control {
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

.grid-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}

.grid-toggle input[type="checkbox"] {
  accent-color: #FF6B35;
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.grid-size {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-left: 1px solid #374151;
  padding-left: 0.625rem;
}

.grid-size input[type="number"] {
  width: 4rem;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #f3f4f6;
  font-size: 0.8rem;
  padding: 0.2rem 0.375rem;
  text-align: right;
}

.grid-size input[type="number"]:focus {
  outline: none;
  border-color: #FF6B35;
}

.grid-size span {
  color: #9ca3af;
}
</style>

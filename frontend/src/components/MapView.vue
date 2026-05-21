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
const mapType = ref('dark');

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

let map = null;
let tileLayer = null;
let tilesLayerGroup = null;
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

  const initial = mapTypes.find((mt) => mt.id === mapType.value);
  tileLayer = L.tileLayer(initial.url, {
    attribution: initial.attribution,
    maxZoom: initial.maxZoom,
  }).addTo(map);

  tilesLayerGroup = L.layerGroup().addTo(map);

  if (props.tiles.length > 0) {
    drawTiles(props.tiles);
  }
});

onBeforeUnmount(() => {
  if (map) {
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
</style>

<template>
  <div class="stats-tab">
    <div class="stats-section">
      <h4 class="section-title">Tiles</h4>
      <div class="stat-row">
        <span class="stat-label">Visited tiles</span>
        <span class="stat-value">{{ tiles.length.toLocaleString() }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Biggest square</span>
        <span class="stat-value">{{ biggestSquareSide > 0 ? `${biggestSquareSide} × ${biggestSquareSide}` : '—' }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Biggest cluster</span>
        <span class="stat-value">{{ biggestCluster > 0 ? biggestCluster.toLocaleString() : '—' }}</span>
      </div>
    </div>

    <div class="stats-section">
      <h4 class="section-title">Activities</h4>
      <div class="stat-row">
        <span class="stat-label">Total</span>
        <span class="stat-value">{{ activities.length.toLocaleString() }}</span>
      </div>

      <template v-if="longestRide">
        <div class="stat-label-full">Longest ride</div>
        <div class="stat-activity">
          <a :href="`https://www.strava.com/activities/${longestRide.strava_id}`" target="_blank" rel="noopener noreferrer" class="activity-link">
            {{ longestRide.name }}
          </a>
          <span class="stat-value">{{ formatDistance(longestRide.distance) }}</span>
        </div>
      </template>

      <template v-if="mostTiles">
        <div class="stat-label-full">Most tiles</div>
        <div class="stat-activity">
          <a :href="`https://www.strava.com/activities/${mostTiles.strava_id}`" target="_blank" rel="noopener noreferrer" class="activity-link">
            {{ mostTiles.name }}
          </a>
          <span class="stat-value">{{ mostTiles.tile_count.toLocaleString() }}</span>
        </div>
      </template>

      <template v-if="mostElevation">
        <div class="stat-label-full">Most elevation</div>
        <div class="stat-activity">
          <a :href="`https://www.strava.com/activities/${mostElevation.strava_id}`" target="_blank" rel="noopener noreferrer" class="activity-link">
            {{ mostElevation.name }}
          </a>
          <span class="stat-value">{{ Math.round(mostElevation.total_elevation_gain) }} m</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { computeBiggestSquare, computeBiggestEnclosedCluster } from '../utils/tileStats.js';

const props = defineProps({
  tiles: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
});

const biggestSquareSide = computed(() => computeBiggestSquare(props.tiles).side);
const biggestCluster = computed(() => computeBiggestEnclosedCluster(props.tiles));

const longestRide = computed(() =>
  [...props.activities].sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0))[0] ?? null
);

const mostTiles = computed(() => {
  const withCount = props.activities.filter((a) => a.tile_count != null);
  return withCount.sort((a, b) => b.tile_count - a.tile_count)[0] ?? null;
});

const mostElevation = computed(() => {
  const withElev = props.activities.filter((a) => a.total_elevation_gain != null);
  return withElev.sort((a, b) => b.total_elevation_gain - a.total_elevation_gain)[0] ?? null;
});

function formatDistance(meters) {
  if (!meters) return '—';
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
}
</script>

<style scoped>
.stats-tab {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.stats-tab::-webkit-scrollbar { width: 4px; }
.stats-tab::-webkit-scrollbar-track { background: transparent; }
.stats-tab::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.25rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.82rem;
}

.stat-label {
  color: #6b7280;
}

.stat-label-full {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.stat-value {
  color: #e5e7eb;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.stat-activity {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.activity-link {
  color: #d1d5db;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.activity-link:hover {
  color: #FF6B35;
  text-decoration: underline;
}
</style>

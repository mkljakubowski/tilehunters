<template>
  <div class="dashboard">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="12" fill="#FF6B35"/>
            <path d="M12 32 L32 12 L52 32 L32 52 Z" fill="none" stroke="white" stroke-width="4"/>
            <rect x="24" y="24" width="16" height="16" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>
          </svg>
          <span>TileHunters</span>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>

      <StatsPanel
        :user="userStore.user"
        :tile-count="tileCount"
        :activity-count="activityCount"
      />

      <div class="sync-section">
        <button
          class="sync-btn"
          :class="{ syncing: syncing }"
          :disabled="syncing"
          @click="syncActivities"
        >
          <svg
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ spinning: syncing }"
          >
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {{ syncing ? 'Syncing…' : 'Sync Activities' }}
        </button>

        <div v-if="syncResult" class="sync-result">
          {{ syncResult }}
        </div>
        <div v-if="syncError" class="sync-error">
          {{ syncError }}
        </div>
      </div>

      <div class="sidebar-tabs">
        <button :class="['tab-btn', { active: sidebarTab === 'activities' }]" @click="sidebarTab = 'activities'">Activities</button>
        <button :class="['tab-btn', { active: sidebarTab === 'stats' }]" @click="sidebarTab = 'stats'">Stats</button>
      </div>

      <ActivityList
        v-if="sidebarTab === 'activities'"
        :activities="activities"
        :selected-activity-id="selectedActivity?.id ?? null"
        :reprocessing-id="reprocessingId"
        @select="selectActivity"
        @reprocess="reprocessTiles"
      />
      <StatsTab
        v-else
        :tiles="visitedTiles"
        :activities="activities"
      />
    </aside>

    <!-- Map -->
    <main class="map-area">
      <MapView
        :tiles="visitedTiles"
        :all-polylines="allPolylines"
        :selected-activity-polyline="selectedPolyline"
        @tile-click="onTileClick"
        @activity-click="onActivityClick"
      />

      <!-- Loading overlay -->
      <div v-if="loadingTiles" class="loading-overlay">
        <div class="spinner"></div>
        <span>Loading tiles…</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.js';
import api from '../api/index.js';
import MapView from '../components/MapView.vue';
import StatsPanel from '../components/StatsPanel.vue';
import ActivityList from '../components/ActivityList.vue';
import StatsTab from '../components/StatsTab.vue';

const router = useRouter();
const userStore = useUserStore();

const visitedTiles = ref([]);
const activities = ref([]);
const allPolylines = ref([]);
const selectedActivity = ref(null);
const selectedPolyline = ref(null);
const loadingTiles = ref(false);
const sidebarTab = ref('activities');
const syncing = ref(false);
const syncResult = ref('');
const syncError = ref('');
const reprocessingId = ref(null);

const tileCount = computed(() => visitedTiles.value.length);
const activityCount = computed(() => activities.value.length);

async function fetchTiles() {
  loadingTiles.value = true;
  try {
    const response = await api.get('/tiles');
    visitedTiles.value = response.data;
  } catch (err) {
    console.error('Failed to fetch tiles:', err);
  } finally {
    loadingTiles.value = false;
  }
}

async function fetchActivities() {
  try {
    const response = await api.get('/activities');
    activities.value = response.data;
  } catch (err) {
    console.error('Failed to fetch activities:', err);
  }
}

async function fetchAllPolylines() {
  try {
    const response = await api.get('/activities/polylines');
    allPolylines.value = response.data;
  } catch (err) {
    console.error('Failed to fetch polylines:', err);
  }
}

async function selectActivity(activity) {
  if (selectedActivity.value?.id === activity.id) {
    // Deselect
    selectedActivity.value = null;
    selectedPolyline.value = null;
    return;
  }

  selectedActivity.value = activity;
  selectedPolyline.value = null;

  try {
    const response = await api.get(`/activities/${activity.id}/polyline`);
    selectedPolyline.value = response.data;
  } catch (err) {
    console.error('Failed to fetch polyline:', err);
  }
}

async function syncActivities() {
  syncing.value = true;
  syncResult.value = '';
  syncError.value = '';

  try {
    const response = await api.post('/activities/sync');
    const { synced, tiles } = response.data;
    syncResult.value = `Synced ${synced} new activit${synced === 1 ? 'y' : 'ies'}. Total: ${tiles.toLocaleString()} tiles.`;
    await Promise.all([fetchTiles(), fetchActivities(), fetchAllPolylines()]);
  } catch (err) {
    console.error('Sync failed:', err);
    syncError.value = err.response?.data?.details || err.message || 'Sync failed. Please try again.';
  } finally {
    syncing.value = false;
  }
}

async function handleLogout() {
  await userStore.logout();
  router.push('/');
}

function onTileClick(tile) {
  console.log('Tile clicked:', tile);
}

async function reprocessTiles(activity) {
  reprocessingId.value = activity.id;
  try {
    await api.post(`/activities/${activity.id}/reprocess-tiles`);
    await fetchTiles();
  } catch (err) {
    console.error('Reprocess failed:', err);
  } finally {
    reprocessingId.value = null;
  }
}

async function onActivityClick(activityId) {
  const activity = activities.value.find((a) => a.id === activityId);
  if (!activity) return;
  sidebarTab.value = 'activities';
  await selectActivity(activity);
  await nextTick();
  document.querySelector(`[data-activity-id="${activityId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    await userStore.fetchMe();
  }
  await Promise.all([fetchTiles(), fetchActivities(), fetchAllPolylines()]);
});
</script>

<style scoped>
.dashboard {
  display: flex;
  height: 100vh;
  background: #0f1117;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  background: #111827;
  border-right: 1px solid #1f2937;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #1f2937;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-weight: 800;
  font-size: 1.1rem;
  color: #f3f4f6;
}

.logout-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}

.logout-btn:hover {
  background: #1f2937;
  color: #e5e7eb;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #1f2937;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.6rem 0;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #e5e7eb;
}

.tab-btn.active {
  color: #f3f4f6;
  border-bottom-color: #FF6B35;
}

.sync-section {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #1f2937;
}

.sync-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #FF6B35;
  color: white;
  border: none;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  width: 100%;
  justify-content: center;
  transition: all 0.15s;
}

.sync-btn:hover:not(:disabled) {
  background: #e55a25;
}

.sync-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.sync-btn.syncing {
  background: #374151;
  color: #9ca3af;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-result {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: #6b7280;
  line-height: 1.4;
}

.sync-error {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: #f87171;
  line-height: 1.4;
}

.map-area {
  flex: 1;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(17, 24, 39, 0.9);
  color: #e5e7eb;
  padding: 0.625rem 1.25rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  backdrop-filter: blur(8px);
  border: 1px solid #374151;
  z-index: 1000;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #374151;
  border-top-color: #FF6B35;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>

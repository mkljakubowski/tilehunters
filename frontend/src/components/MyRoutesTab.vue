<template>
  <div class="routes-tab">
    <div v-if="routes.length === 0" class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/>
      </svg>
      <p>No saved routes yet.<br/>Upload a GPX file and save it.</p>
    </div>

    <div v-else class="route-list">
      <div v-for="route in routes" :key="route.id" class="route-item">
        <div class="route-header">
          <label class="route-toggle">
            <input type="checkbox" :checked="activeIds.has(route.id)" @change="toggle(route)" />
            <span class="route-name">{{ route.name }}</span>
          </label>
          <button class="delete-btn" title="Delete" @click="deleteRoute(route.id)">✕</button>
        </div>
        <div class="route-meta">{{ formatDate(route.created_at) }} · {{ formatPoints(route.points) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api/index.js';

const emit = defineEmits(['routes-changed']);

const routes = ref([]);
const activeIds = ref(new Set());

async function fetchRoutes() {
  try {
    const res = await api.get('/routes');
    routes.value = res.data;
  } catch (err) {
    console.error('Failed to fetch routes:', err);
  }
}

async function deleteRoute(id) {
  try {
    await api.delete(`/routes/${id}`);
    activeIds.value.delete(id);
    routes.value = routes.value.filter((r) => r.id !== id);
    emitActive();
  } catch (err) {
    console.error('Failed to delete route:', err);
  }
}

function toggle(route) {
  if (activeIds.value.has(route.id)) {
    activeIds.value.delete(route.id);
  } else {
    activeIds.value.add(route.id);
  }
  emitActive();
}

function emitActive() {
  const active = routes.value.filter((r) => activeIds.value.has(r.id));
  emit('routes-changed', active);
}

function formatDate(str) {
  return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPoints(points) {
  return Array.isArray(points) ? `${points.length.toLocaleString()} pts` : '';
}

onMounted(fetchRoutes);

defineExpose({ fetchRoutes });
</script>

<style scoped>
.routes-tab {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.routes-tab::-webkit-scrollbar { width: 4px; }
.routes-tab::-webkit-scrollbar-track { background: transparent; }
.routes-tab::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: #4b5563;
  text-align: center;
}

.empty-state p {
  font-size: 0.85rem;
  line-height: 1.5;
}

.route-list {
  display: flex;
  flex-direction: column;
}

.route-item {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid #1a2232;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.route-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  min-width: 0;
}

.route-toggle input[type="checkbox"] {
  accent-color: #facc15;
  cursor: pointer;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.route-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-meta {
  font-size: 0.72rem;
  color: #6b7280;
  padding-left: 1.375rem;
}

.delete-btn {
  background: none;
  border: none;
  color: #4b5563;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  flex-shrink: 0;
  transition: color 0.15s;
}

.delete-btn:hover {
  color: #f87171;
}
</style>

<template>
  <div class="activity-list">
    <div class="list-header">
      <h3>Activities</h3>
      <span class="count" v-if="activities.length">{{ activities.length }}</span>
    </div>

    <div v-if="activities.length === 0" class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <p>No activities yet.<br/>Sync to load your Strava data.</p>
    </div>

    <div v-else class="list-scroll">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-item"
        :class="{ active: selectedActivityId === activity.id }"
        @click="$emit('select', activity)"
      >
        <div class="activity-icon" :title="activity.sport_type">
          {{ sportIcon(activity.sport_type) }}
        </div>
        <div class="activity-info">
          <div class="activity-name">{{ activity.name }}</div>
          <div class="activity-meta">
            <span>{{ formatDate(activity.start_date) }}</span>
            <span class="sep">·</span>
            <span>{{ formatDistance(activity.distance) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activities: {
    type: Array,
    default: () => [],
  },
  selectedActivityId: {
    type: Number,
    default: null,
  },
});

defineEmits(['select']);

function sportIcon(sportType) {
  if (!sportType) return '🏃';
  const t = sportType.toLowerCase();
  if (t.includes('run')) return '🏃';
  if (t.includes('ride') || t.includes('cycling')) return '🚴';
  if (t.includes('swim')) return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🥾';
  if (t.includes('ski')) return '⛷️';
  if (t.includes('canoe') || t.includes('kayak') || t.includes('row')) return '🚣';
  if (t.includes('yoga')) return '🧘';
  if (t.includes('workout') || t.includes('weight')) return '🏋️';
  return '🏅';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDistance(meters) {
  if (!meters) return '—';
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
}
</script>

<style scoped>
.activity-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  border-bottom: 1px solid #1f2937;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem 0.5rem;
}

.list-header h3 {
  font-size: 0.8rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.count {
  background: #1f2937;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}

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

.list-scroll {
  overflow-y: auto;
  flex: 1;
}

.list-scroll::-webkit-scrollbar {
  width: 4px;
}
.list-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.list-scroll::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 2px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.activity-item:hover {
  background: #1f2937;
}

.activity-item.active {
  background: #1f2937;
  border-left-color: #FF6B35;
}

.activity-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.activity-info {
  min-width: 0;
}

.activity-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.sep {
  margin: 0 0.25rem;
}
</style>

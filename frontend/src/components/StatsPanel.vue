<template>
  <div class="stats-panel">
    <div class="user-info" v-if="user">
      <img
        v-if="user.profile_picture"
        :src="user.profile_picture"
        :alt="`${user.firstname} ${user.lastname}`"
        class="avatar"
      />
      <div v-else class="avatar avatar-placeholder">
        {{ initials }}
      </div>
      <div class="user-details">
        <div class="user-name">{{ user.firstname }} {{ user.lastname }}</div>
        <div class="user-handle" v-if="user.username">@{{ user.username }}</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
        </div>
        <div class="stat-value">{{ tileCount.toLocaleString() }}</div>
        <div class="stat-label">Tiles Explored</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="stat-value">{{ activityCount.toLocaleString() }}</div>
        <div class="stat-label">Activities</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  tileCount: {
    type: Number,
    default: 0,
  },
  activityCount: {
    type: Number,
    default: 0,
  },
});

const initials = computed(() => {
  if (!props.user) return '?';
  const first = props.user.firstname?.[0] || '';
  const last = props.user.lastname?.[0] || '';
  return (first + last).toUpperCase() || '?';
});
</script>

<style scoped>
.stats-panel {
  padding: 1rem;
  border-bottom: 1px solid #1f2937;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #FF6B35;
  flex-shrink: 0;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f2937;
  color: #9ca3af;
  font-weight: 700;
  font-size: 1rem;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #f3f4f6;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-handle {
  font-size: 0.8rem;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-card {
  background: #1f2937;
  border-radius: 10px;
  padding: 0.875rem;
  text-align: center;
}

.stat-icon {
  color: #FF6B35;
  display: flex;
  justify-content: center;
  margin-bottom: 0.4rem;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f3f4f6;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.72rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>

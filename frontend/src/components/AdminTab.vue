<template>
  <div class="admin-tab">
    <div class="admin-section">
      <h4 class="section-title">Tiles</h4>
      <p class="description">Recompute visited tiles for all activities using the best available polyline. New tiles will be added; existing ones are left unchanged.</p>
      <button class="admin-btn" :disabled="running" @click="reprocessAll">
        {{ running ? `Processing… (${result ? result.processed : 0} done)` : 'Reprocess all tiles' }}
      </button>
      <div v-if="result" class="result">
        Done — {{ result.processed }} activities processed, {{ result.inserted.toLocaleString() }} new tiles added.
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api/index.js';

const emit = defineEmits(['tiles-updated']);

const running = ref(false);
const result = ref(null);
const error = ref('');

async function reprocessAll() {
  running.value = true;
  result.value = null;
  error.value = '';
  try {
    const res = await api.post('/activities/reprocess-all-tiles');
    result.value = res.data;
    emit('tiles-updated');
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed.';
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.admin-tab {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.admin-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.description {
  font-size: 0.78rem;
  color: #6b7280;
  line-height: 1.5;
}

.admin-btn {
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #d1d5db;
  font-size: 0.82rem;
  padding: 0.5rem 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.admin-btn:hover:not(:disabled) {
  background: #374151;
  color: #f3f4f6;
}

.admin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  font-size: 0.78rem;
  color: #22c55e;
  line-height: 1.4;
}

.error {
  font-size: 0.78rem;
  color: #f87171;
  line-height: 1.4;
}
</style>

<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <div class="logo">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="#FF6B35"/>
            <path d="M12 32 L32 12 L52 32 L32 52 Z" fill="none" stroke="white" stroke-width="3"/>
            <rect x="24" y="24" width="16" height="16" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="2"/>
            <circle cx="32" cy="32" r="3" fill="white"/>
          </svg>
        </div>
        <h1>TileHunters</h1>
        <p class="tagline">Explore the world, one tile at a time</p>
        <p class="description">
          Connect your Strava account and discover which map tiles you've covered
          with your runs, rides, and adventures. Track your exploration progress
          and see your routes painted across the map.
        </p>

        <div v-if="error" class="error-message">
          {{ errorMessage }}
        </div>

        <a href="/api/auth/strava" class="strava-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
          </svg>
          Connect with Strava
        </a>

        <div class="features">
          <div class="feature">
            <span class="feature-icon">🗺️</span>
            <span>Visualize your coverage</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📊</span>
            <span>Track tile statistics</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🏃</span>
            <span>All activity types</span>
          </div>
        </div>
      </div>
    </div>

    <div class="map-preview" aria-hidden="true">
      <div class="tile-grid">
        <div
          v-for="(tile, i) in demoTiles"
          :key="i"
          class="demo-tile"
          :style="{ opacity: tile.opacity, animationDelay: `${tile.delay}s` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.js';

const router = useRouter();
const userStore = useUserStore();

const error = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('error');
});

const errorMessage = computed(() => {
  switch (error.value) {
    case 'access_denied': return 'Access was denied. Please try connecting again.';
    case 'auth_failed': return 'Authentication failed. Please try again.';
    default: return 'An error occurred. Please try again.';
  }
});

// Generate demo tiles for background decoration
const demoTiles = Array.from({ length: 120 }, (_, i) => ({
  opacity: Math.random() > 0.6 ? Math.random() * 0.4 + 0.1 : 0,
  delay: Math.random() * 3,
}));

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    await userStore.fetchMe();
  }
  if (userStore.isLoggedIn) {
    router.push('/dashboard');
  }
});
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #0f1117;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.map-preview {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.4;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(10, 1fr);
  height: 100%;
  gap: 2px;
  padding: 2px;
}

.demo-tile {
  background: #FF6B35;
  border-radius: 2px;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: var(--opacity, 0.2); }
  50% { opacity: calc(var(--opacity, 0.2) * 1.5); }
}

.hero {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 2rem;
}

.hero-content {
  max-width: 560px;
  margin: 0 auto;
}

.logo {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

h1 {
  font-size: 3.5rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -1px;
  margin-bottom: 0.5rem;
}

.tagline {
  font-size: 1.25rem;
  color: #FF6B35;
  font-weight: 600;
  margin-bottom: 1rem;
}

.description {
  color: #9ca3af;
  line-height: 1.7;
  margin-bottom: 2rem;
  font-size: 1rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.strava-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: #FC4C02;
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.05rem;
  transition: all 0.2s;
  box-shadow: 0 4px 24px rgba(252, 76, 2, 0.35);
  margin-bottom: 2.5rem;
}

.strava-btn:hover {
  background: #e04400;
  transform: translateY(-2px);
  box-shadow: 0 6px 32px rgba(252, 76, 2, 0.45);
}

.features {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.feature-icon {
  font-size: 1.1rem;
}
</style>

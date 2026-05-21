import { defineStore } from 'pinia';
import api from '../api/index.js';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
  },

  actions: {
    async fetchMe() {
      this.loading = true;
      try {
        const response = await api.get('/auth/me');
        this.user = response.data;
      } catch (err) {
        this.user = null;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        // ignore errors
      } finally {
        this.user = null;
      }
    },
  },
});

<template>
  <header class="app-header">
    <h1>ReadiT</h1>
    <div class="theme-controls">
      <button @click="toggleTheme" class="theme-toggle-btn" :title="themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
        <span v-if="themeStore.isDarkMode">
          <!-- Sun Icon (for switching to Light Mode) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </span>
        <span v-else>
          <!-- Moon Icon (for switching to Dark Mode) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useThemeStore } from '@/stores/themeStore';

const themeStore = useThemeStore();

const toggleTheme = () => {
  themeStore.toggleTheme();
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem; /* Consistent padding */
  background-color: var(--secondary-bg-color); /* Relies on global variable */
  height: 60px; /* Standard header height */
  box-sizing: border-box;
  position: sticky; /* Keep header at the top */
  top: 0; /* Explicitly set top for sticky positioning */
  z-index: 1000; /* Ensure header is above other content */
  color: var(--text-color);
  border: none; /* Ensure no borders */
  box-shadow: none; /* Ensure no shadow */
}

.app-header h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
}

.theme-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle-btn {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--border-color);
}

.theme-toggle-btn svg {
  width: 20px;
  height: 20px;
  stroke: var(--text-color);
}

/* Removed unused local theme variable blocks for .app-header */

</style> 
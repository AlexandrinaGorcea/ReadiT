<template>
  <footer class="app-footer">
    <p>&copy; {{ currentYear }} ReadiT. All rights reserved.</p>
  </footer>
</template>

<script setup>
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style scoped>
.app-footer {
  padding: 1rem;
  text-align: center;
  background-color: var(--footer-bg-color, #f0f0f0);
  border-top: 1px solid var(--border-color, #ccc);
  color: var(--text-color, #333);
  font-size: 0.9em;
  height: var(--footer-height, 60px); /* Ensure it matches App.vue padding */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Basic theme variables for footer - can be expanded in App.vue or a global CSS file */
.theme-light .app-footer {
  --footer-bg-color: #f0f0f0;
  --border-color: #ccc;
  --text-color: #333;
}

.theme-dark .app-footer {
  --footer-bg-color: #2d2d2d;
  --border-color: #555;
  --text-color: #f0f0f0;
}
</style> 
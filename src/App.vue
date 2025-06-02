<script setup>
import { onMounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import { useThemeStore } from './stores/themeStore';

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initializeTheme();
});
</script>

<template>
  <div id="app-container" :data-theme="themeStore.currentTheme">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.main-content {
  flex: 1;
  padding-bottom: var(--footer-height, 60px);
  background-color: var(--secondary-bg-color);
  border: none;
}

/* 
html.theme-dark .main-content {
  background-color: var(--secondary-bg-color);
}
*/
</style>

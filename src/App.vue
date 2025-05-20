<script setup>
import { onMounted, computed } from 'vue';
import { useThemeStore } from './stores/themeStore';
import { useBookStore } from './stores/bookStore'; // Import book store
import LibraryView from './views/LibraryView.vue';
import ReaderView from './views/ReaderView.vue';

const themeStore = useThemeStore();
const bookStore = useBookStore(); // Use the book store

const currentTheme = computed(() => themeStore.currentTheme);
const showReaderView = computed(() => bookStore.isBookSelected);

onMounted(() => {
  themeStore.initializeTheme();
  // Book manifest will be fetched by LibraryView if needed
});

</script>

<template>
  <div class="app">
    <header>
      <h1>ReadiT - Book Reader</h1>
      <button @click="themeStore.toggleTheme()" class="theme-toggle-button">
        Switch to {{ currentTheme === 'light' ? 'Dark' : 'Light' }} Mode
      </button>
    </header>

    <main>
      <ReaderView v-if="showReaderView" />
      <LibraryView v-else />
    </main>

    <footer>
      <p>&copy; 2025 ReadiT App</p>
    </footer>
  </div>
</template>

<style>
/* Global styles for :root (CSS variables for themes) and body are here */
/* They affect LibraryView and ReaderView as well */

/* Light theme (default) */
:root,
:root.theme-light {
  --bg-color: #ffffff;
  --text-color: #333333;
  --header-bg: #2c3e50;
  --header-text: #ffffff;
  --footer-bg: #2c3e50;
  --footer-text: #ffffff;
  --button-bg: #4CAF50;
  --button-text: #ffffff;
  --author-text: #555;
  --cover-border: #ddd;
  --cover-shadow: rgba(0, 0, 0, 0.1);
}

/* Dark theme */
:root.theme-dark {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --header-bg: #1f2937;
  /* Darker blue-gray */
  --header-text: #e0e0e0;
  --footer-bg: #1f2937;
  --footer-text: #e0e0e0;
  --button-bg: #5cb85c;
  /* Lighter green for dark mode */
  --button-text: #1a1a1a;
  --author-text: #aaa;
  --cover-border: #444;
  --cover-shadow: rgba(255, 255, 255, 0.1);
}

/* Apply theme variables */
body {
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: Arial, sans-serif;
  line-height: 1.6;
  margin: 0; /* Ensure no default body margin */
  padding: 0; /* Ensure no default body padding */
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

header {
  background-color: var(--header-bg);
  color: var(--header-text);
  padding: 1rem;
  text-align: center;
  position: relative;
}

main {
  flex: 1;
  padding: 1rem; /* Reduced padding for more space for views */
  max-width: 1000px; /* Slightly wider for library view */
  margin: 0 auto;
  width: 100%;
  /* background-color: var(--bg-color); No longer needed here, body/app handles it */
}

footer {
  background-color: var(--footer-bg);
  color: var(--footer-text);
  padding: 1rem;
  text-align: center;
}

.theme-toggle-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: none;
  padding: 8px 16px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 4px;
  position: absolute;
  top: 10px;
  right: 10px;
}

/* Generic loading/error styles that can be used by views if not overridden */
.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
  color: var(--text-color);
}

.error p {
  color: red; /* Standard error color */
}

</style>

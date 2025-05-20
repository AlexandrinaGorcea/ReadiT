<script setup>
import { ref, onMounted, computed } from 'vue';
import BookService from './BookService.js';
import { useThemeStore } from './stores/themeStore';

const book = ref(null);
const isLoading = ref(false);
const error = ref(null);

const themeStore = useThemeStore();

const currentTheme = computed(() => themeStore.currentTheme);

async function fetchBook() {
  isLoading.value = true;
  error.value = null;
  try {
    // For now, we'll hardcode loading 'book-1'
    const data = await BookService.loadBookById('book-1');
    book.value = data;
  } catch (err) {
    console.error('Failed to load book in component:', err);
    error.value = 'Failed to load book. Please try again later.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchBook();
  themeStore.initializeTheme();
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
      <div v-if="isLoading" class="loading">
        <p>Loading book...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
      </div>
      <div v-else-if="book" class="book-display">
        <h2>{{ book.title }}</h2>
        <p class="author">By: {{ book.author }} ({{ book.year }})</p>
        <img v-if="book.coverImage" :src="book.coverImage" :alt="`Cover of ${book.title}`" class="cover-image">
        <div class="paragraphs">
          <p v-for="(paragraph, index) in book.paragraphs" :key="index">
            {{ paragraph }}
          </p>
        </div>
      </div>
      <div v-else>
        <p>Welcome to ReadiT, your personal book reading companion! No book loaded yet.</p>
      </div>
    </main>

    <footer>
      <p>&copy; 2025 ReadiT App</p>
    </footer>
  </div>
</template>

<style>
/* App.vue specific styles, can also be in style.css */
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
  padding: 2rem;
  max-width: 800px; /* Adjusted for better readability of book content */
  margin: 0 auto;
  width: 100%;
  background-color: var(--bg-color);
}

footer {
  background-color: var(--footer-bg);
  color: var(--footer-text);
  padding: 1rem;
  text-align: center;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
}

.error p {
  color: red;
}

.book-display {
  margin-top: 1rem;
}

.book-display h2 {
  margin-bottom: 0.5rem;
  font-size: 2em;
}

.book-display .author {
  font-style: italic;
  color: var(--author-text);
  margin-bottom: 1rem;
}

.book-display .cover-image {
  display: block;
  max-width: 250px;
  height: auto;
  margin: 0 auto 1.5rem auto;
  border: 1px solid var(--cover-border);
  box-shadow: 2px 2px 5px var(--cover-shadow);
}

.book-display .paragraphs p {
  margin-bottom: 1em;
  line-height: 1.6;
  text-align: justify;
  color: var(--text-color);
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

/* Light theme (default) */
:root, :root.theme-light {
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
  --cover-shadow: rgba(0,0,0,0.1);
}

/* Dark theme */
:root.theme-dark {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --header-bg: #1f2937; /* Darker blue-gray */
  --header-text: #e0e0e0;
  --footer-bg: #1f2937;
  --footer-text: #e0e0e0;
  --button-bg: #5cb85c; /* Lighter green for dark mode */
  --button-text: #1a1a1a;
  --author-text: #aaa;
  --cover-border: #444;
  --cover-shadow: rgba(255,255,255,0.1);
}

/* Apply theme variables */
body {
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: Arial, sans-serif;
  line-height: 1.6;
}

/* Reset some global styles from style.css if they conflict, or move them here */
/* For example, if style.css set a body color, it would be overridden by body styles here */

</style>

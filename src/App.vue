<script setup>
import { ref, onMounted } from 'vue';
import BookService from './BookService.js';

const book = ref(null);
const isLoading = ref(false);
const error = ref(null);

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
});

</script>

<template>
  <div class="app">
    <header>
      <h1>ReadiT - Book Reader</h1>
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
}

header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 800px; /* Adjusted for better readability of book content */
  margin: 0 auto;
  width: 100%;
}

footer {
  background-color: #2c3e50;
  color: white;
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
  color: #555;
  margin-bottom: 1rem;
}

.book-display .cover-image {
  display: block;
  max-width: 250px;
  height: auto;
  margin: 0 auto 1.5rem auto;
  border: 1px solid #ddd;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
}

.book-display .paragraphs p {
  margin-bottom: 1em;
  line-height: 1.6;
  text-align: justify;
}

</style>

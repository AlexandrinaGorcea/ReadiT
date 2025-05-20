<template>
  <div class="library-view">
    <h2>Book Library</h2>
    <div v-if="bookStore.isLoadingManifest" class="loading">
      <p>Loading library...</p>
    </div>
    <div v-else-if="bookStore.manifestError" class="error">
      <p>{{ bookStore.manifestError }}</p>
    </div>
    <div v-else-if="bookStore.books.length === 0" class="empty-library">
      <p>No books available in the library.</p>
    </div>
    <div v-else class="book-grid">
      <div v-for="book in bookStore.books" :key="book.id" class="book-card" @click="selectBook(book.id)">
        <img v-if="book.coverImage" :src="book.coverImage" :alt="`Cover of ${book.title}`" class="book-cover">
        <div v-else class="book-cover-placeholder">No Cover</div>
        <h3>{{ book.title }}</h3>
        <p>{{ book.author }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useBookStore } from '../stores/bookStore';

const bookStore = useBookStore();

onMounted(() => {
  // Fetch manifest only if books array is empty
  if (bookStore.books.length === 0) {
    bookStore.fetchBookManifest();
  }
});

function selectBook(bookId) {
  bookStore.selectBook(bookId);
  // App.vue will handle switching to ReaderView based on store state
}
</script>

<style scoped>
.library-view {
  padding: 1rem;
}

.library-view h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.8em;
  color: var(--text-color);
}

.loading,
.error,
.empty-library {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
  color: var(--text-color);
}

.error p {
  color: red;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
}

.book-card {
  border: 1px solid var(--cover-border);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  background-color: var(--bg-color);
  box-shadow: 0 2px 4px var(--cover-shadow);
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px var(--cover-shadow);
}

.book-cover {
  width: 100%;
  max-width: 150px;
  height: auto;
  aspect-ratio: 2 / 3; /* Maintain aspect ratio for covers */
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.75rem;
  background-color: #f0f0f0; /* Fallback for missing images */
}

.book-cover-placeholder {
  width: 100%;
  max-width: 150px;
  height: 225px; /* Approx 2/3 aspect ratio for 150px width */
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  color: #757575;
  font-size: 0.9em;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.book-card h3 {
  font-size: 1.1em;
  margin-bottom: 0.25rem;
  color: var(--text-color);
  /* Truncate long titles */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-card p {
  font-size: 0.9em;
  color: var(--author-text);
}
</style> 
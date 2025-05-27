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
        <div class="book-info">
          <h3>{{ book.title }}</h3>
          <p>{{ book.author }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { useRouter } from 'vue-router';

const bookStore = useBookStore();
const router = useRouter();

onMounted(() => {
  // Fetch manifest only if books array is empty
  if (bookStore.books.length === 0) {
    bookStore.fetchBookManifest();
  }
});

function selectBook(bookId) {
  bookStore.selectBook(bookId);
  router.push({ name: 'Reader', params: { bookId: bookId } });
}
</script>

<style scoped>
.library-view {
  padding: 1rem 2rem;
}

.library-view h2 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2em;
  font-weight: 600;
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2rem;
}

.book-card {
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  background-color: var(--secondary-bg-color, var(--bg-color));
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.book-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.08);
}

.book-cover, .book-cover-placeholder {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 0;
  background-color: #e0e0e0;
  border-bottom: 1px solid var(--border-color);
}

.book-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #757575;
  font-size: 1em;
}

.book-info {
  padding: 0.75rem 1rem;
}

.book-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.book-card p {
  font-size: 0.85rem;
  color: var(--author-text);
  line-height: 1.3;
}
</style> 
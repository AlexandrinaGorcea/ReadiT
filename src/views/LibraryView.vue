<template>
  <div class="library-view">
    <div class="library-header">
      <h2>My Library</h2>
      <input 
        type="text" 
        v-model="searchTerm" 
        placeholder="Filter by title or author..."
        class="filter-input"
      />
    </div>
    <div v-if="bookStore.isLoadingBooks" class="loading-books">
      <p>Loading books...</p>
    </div>
    <div v-else-if="bookStore.bookError" class="error-books">
      <p>Error loading books: {{ bookStore.bookError }}</p>
    </div>
    <div v-else-if="filteredBooks.length > 0" class="book-list">
      <div 
        v-for="book in filteredBooks" 
        :key="book.id" 
        class="book-card" 
        @click="navigateToBook(book.id)"
        :style="{ '--cover-image-url': 'url(' + book.coverImage + ')' }"
      >
        <div class="book-cover"></div>
        <div class="book-info">
          <h3 class="book-title">{{ book.title }}</h3>
          <p class="book-author">By: {{ book.author }}</p>
          <p class="book-year">({{ book.year }})</p>
        </div>
      </div>
    </div>
    <div v-else-if="bookStore.books.length > 0 && filteredBooks.length === 0" class="no-results">
      <p>No books match your filter "{{ searchTerm }}".</p>
    </div>
    <div v-else class="no-books">
      <p>No books in your library yet. Consider adding some!</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { useRouter } from 'vue-router';

const bookStore = useBookStore();
const router = useRouter();

const searchTerm = ref('');

const filteredBooks = computed(() => {
  if (!bookStore.books) return [];
  const term = searchTerm.value.toLowerCase().trim();
  if (!term) {
    return bookStore.books;
  }
  return bookStore.books.filter(book => {
    const titleMatch = book.title && book.title.toLowerCase().includes(term);
    const authorMatch = book.author && book.author.toLowerCase().includes(term);
    return titleMatch || authorMatch;
  });
});

onMounted(async () => {
  if (bookStore.books.length === 0) {
    await bookStore.fetchBookManifest();
  }
});

function navigateToBook(bookId) {
  router.push({ name: 'ReaderView', params: { bookId } });
}
</script>

<style scoped>
.library-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.library-header h2 {
  margin: 0;
  font-size: 2em;
  font-weight: 600;
  color: var(--text-color);
}

.filter-input {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.95em;
  background-color: var(--secondary-bg-color);
  color: var(--text-color);
  min-width: 250px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 0,0,0), 0.2);
}

.book-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem;
}

.book-card {
  background-color: var(--secondary-bg-color);
  border-radius: 10px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  padding: 0;
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
}

.book-cover {
  width: 100%;
  padding-top: 140%;
  background-image: var(--cover-image-url);
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--border-color);
}

.book-info {
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.book-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.3rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 2.6em;
}

.book-author {
  font-size: 0.85em;
  color: var(--author-text, var(--text-color));
  opacity: 0.8;
  margin-bottom: 0.2rem;
  line-height: 1.4;
}

.book-year {
  font-size: 0.8em;
  color: var(--text-color);
  opacity: 0.6;
  margin-top: auto;
}

.loading-books,
.error-books,
.no-books,
.no-results {
  text-align: center;
  padding: 2rem;
  font-size: 1.1em;
  color: var(--text-color);
  opacity: 0.8;
}
</style> 
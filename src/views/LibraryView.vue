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
          <p v-if="String(book.year || '').trim()" class="book-year">({{ book.year }})</p>
        </div>
        <div class="book-progress-bar-container">
          <div class="book-progress-bar" :style="{ width: (book.id === 'pride-and-prejudice' ? '60%' : (book.id === 'romeo-and-juliet' ? '25%' : '0%')) }"></div>
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
  router.push({ name: 'Reader', params: { bookId } });
}
</script>

<style scoped>
.library-view {
  padding: var(--header-height, 60px) 1.5rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.library-header h2 {
  margin: 0;
  font-size: 1.8em;
  font-weight: 500;
  color: var(--text-color);
}

.filter-input {
  padding: 0.7rem 1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0.95em;
  background-color: var(--controls-bg);
  color: var(--text-color);
  min-width: 250px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 0,0,0), 0.2);
}

.book-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 2rem;
}

.book-card {
  background-color: var(--secondary-bg-color);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  padding: 0;
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.12);
}

.book-card:hover .book-cover {
  transform: scale(1.03);
}

.book-cover {
  width: 100%;
  padding-top: 140%;
  background-image: var(--cover-image-url);
  background-size: cover;
  background-position: center;
  transition: transform 0.2s ease-out;
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
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 3.9em;
}

.book-author {
  font-size: 0.8rem;
  color: var(--author-text, var(--text-color));
  opacity: 0.75;
  margin-bottom: 0.2rem;
  line-height: 1.4;
}

.book-year {
  font-size: 0.75rem;
  color: var(--text-color);
  opacity: 0.65;
  margin-top: auto;
}

.book-progress-bar-container {
  height: 6px;
  background-color: var(--progress-track-bg);
  border-radius: 3px;
  overflow: hidden;
  margin: 0 1rem 0.75rem 1rem;
}

.book-progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 3px;
  transition: width 0.3s ease-in-out;
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
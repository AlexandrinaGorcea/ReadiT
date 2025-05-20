<template>
  <div class="reader-view">
    <button @click="goBackToLibrary" class="back-button">&larr; Back to Library</button>
    <div v-if="bookStore.isLoadingBook" class="loading">
      <p>Loading book content...</p>
    </div>
    <div v-else-if="bookStore.bookError" class="error">
      <p>{{ bookStore.bookError }}</p>
    </div>
    <div v-else-if="bookData" class="book-content">
      <h2>{{ bookData.title }}</h2>
      <p class="author">By: {{ bookData.author }} ({{ bookData.year }})</p>
      <img 
        v-if="bookData.coverImage" 
        :src="bookData.coverImage" 
        :alt="`Cover of ${bookData.title}`" 
        class="cover-image"
      >
      <div class="paragraphs">
        <p v-for="(paragraph, index) in bookData.paragraphs" :key="index">
          {{ paragraph }}
        </p>
      </div>
    </div>
    <div v-else class="no-book-selected">
      <p>No book selected, or book data is missing.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBookStore } from '../stores/bookStore';

const bookStore = useBookStore();

const bookData = computed(() => bookStore.currentBookData);

function goBackToLibrary() {
  bookStore.deselectBook();
  // App.vue will switch back to LibraryView
}
</script>

<style scoped>
.reader-view {
  padding: 1rem;
  color: var(--text-color);
}

.back-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-bottom: 1.5rem;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  opacity: 0.9;
}

.loading,
.error,
.no-book-selected {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
}

.error p {
  color: red;
}

.book-content h2 {
  margin-bottom: 0.5rem;
  font-size: 2em;
  text-align: center;
}

.book-content .author {
  font-style: italic;
  color: var(--author-text);
  margin-bottom: 1rem;
  text-align: center;
}

.book-content .cover-image {
  display: block;
  max-width: 250px;
  height: auto;
  margin: 0 auto 1.5rem auto;
  border: 1px solid var(--cover-border);
  box-shadow: 2px 2px 5px var(--cover-shadow);
}

.book-content .paragraphs p {
  margin-bottom: 1em;
  line-height: 1.6;
  text-align: justify;
}
</style> 
<template>
  <div class="reader-view" ref="readerViewRef" @scroll.passive="handleScroll">
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
      <div class="paragraphs-container" ref="paragraphsContainerRef">
        <p 
          v-for="(paragraph, index) in bookData.paragraphs" 
          :key="index" 
          :ref="el => { if (el) paragraphRefs[index] = el }"
          :id="`paragraph-${index}`"
          class="book-paragraph"
        >
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
import { computed, onMounted, onBeforeUpdate, onUnmounted, ref, nextTick, watch } from 'vue';
import { useBookStore } from '../stores/bookStore';

const bookStore = useBookStore();
const bookData = computed(() => bookStore.currentBookData);

const readerViewRef = ref(null); // Ref for the main scrollable div
const paragraphsContainerRef = ref(null); // Ref for the paragraphs container
const paragraphRefs = ref([]); // Refs for individual paragraph elements

let observer = null;
let debounceTimer = null;

// Ensure refs array is cleared before each update (important for v-for)
onBeforeUpdate(() => {
  paragraphRefs.value = [];
});

function initializeScrollRestoration() {
  if (bookData.value && bookData.value.id) {
    const restoredIndex = bookStore.restoreProgress(bookData.value.id);
    if (restoredIndex > 0) {
      scrollToParagraph(restoredIndex, 'auto'); // 'auto' for instant scroll
    }
  }
}

function scrollToParagraph(index, behavior = 'smooth') {
  nextTick(() => {
    const targetParagraph = paragraphRefs.value[index];
    if (targetParagraph && readerViewRef.value) {
        // Calculate offset relative to the readerViewRef scroll container
        const offsetTop = targetParagraph.offsetTop - readerViewRef.value.offsetTop;
        readerViewRef.value.scrollTo({
            top: offsetTop,
            behavior: behavior
        });
    }
  });
}

// Watch for bookData to change (e.g., new book selected) to re-initialize
watch(bookData, (newData, oldData) => {
  if (newData && (!oldData || newData.id !== oldData.id)) {
    nextTick(() => { // Ensure DOM is updated
        initializeScrollRestoration();
        setupIntersectionObserver();
    });
  }
}, { immediate: false }); // Don't run immediately, wait for mount and data load


const handleScroll = () => {
  if (!paragraphsContainerRef.value || !bookData.value) return;

  // Simple scroll detection without IntersectionObserver for debouncing save
  // More accurate paragraph detection will be handled by IntersectionObserver
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // The actual current paragraph index should be updated by the observer
    // This just triggers a save with the last known index from the store
    if (bookData.value && bookData.value.id) {
        bookStore.saveProgress(bookData.value.id, bookStore.currentParagraphIndex);
    }
  }, 500); // Debounce saving for 500ms
};


function setupIntersectionObserver() {
  if (observer) {
    observer.disconnect();
  }
  if (!paragraphsContainerRef.value || paragraphRefs.value.length === 0) return;

  const options = {
    root: readerViewRef.value, // Scrollable area
    rootMargin: '0px',
    threshold: 0.5 // Trigger when 50% of the paragraph is visible
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const paragraphId = entry.target.id;
        const index = parseInt(paragraphId.split('-')[1]);
        // Update store, but don't trigger a save immediately from here to avoid loops
        // The debounced saveProgress on scroll will handle saving.
        bookStore.currentParagraphIndex = index; 
      }
    });
  }, options);

  paragraphRefs.value.forEach(p => {
    if (p) observer.observe(p);
  });
}

onMounted(() => {
    if (bookData.value) { // If book data is already present on mount
        initializeScrollRestoration();
        setupIntersectionObserver();
    }
  // Listen to scroll on the readerViewRef itself
  if (readerViewRef.value) {
    // Scroll listener is already attached via @scroll on template
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearTimeout(debounceTimer);
});

function goBackToLibrary() {
  // Save final position before going back
  if (bookData.value && bookData.value.id) {
      bookStore.saveProgress(bookData.value.id, bookStore.currentParagraphIndex);
  }
  bookStore.deselectBook();
}
</script>

<style scoped>
.reader-view {
  padding: 1rem;
  color: var(--text-color);
  overflow-y: auto; /* Make this the scrollable container */
  height: calc(100vh - 150px); /* Adjust based on header/footer height, make it dynamic if needed */
  position: relative; /* For Intersection Observer with a specific root */
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

.book-content .paragraphs-container p.book-paragraph {
  margin-bottom: 1em;
  line-height: 1.6;
  text-align: justify;
}

.book-paragraph {
  /* Add some margin/padding if needed for observer to work reliably */
  /* especially if paragraphs are very short */
  padding-bottom: 10px; /* Ensure some space for intersection */
}
</style> 
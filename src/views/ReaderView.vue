<template>
  <div 
    class="reader-view" 
    ref="readerViewRef" 
    @scroll.passive="handleScroll"
    :class="[themeStore.readerAppearanceClass]" 
    :style="{ fontSize: themeStore.readerFontSize }"
  >
    <ReaderControls />
    <div class="reader-actions">
        <button @click="goBackToLibrary" class="back-button">&larr; Back to Library</button>
        <button @click="addCurrentPageBookmark" class="bookmark-button" title="Bookmark this page">&#128278; Bookmark</button> 
    </div>
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
      <BookmarkList @navigate-to-paragraph="scrollToParagraph" />
    </div>
    <div v-else class="no-book-selected">
      <p>No book selected, or book data is missing.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUpdate, onUnmounted, ref, nextTick, watch } from 'vue';
import { useBookStore } from '../stores/bookStore';
import { useThemeStore } from '../stores/themeStore';
import ReaderControls from '../components/ReaderControls.vue';
import { useBookmarkStore } from '../stores/bookmarkStore';
import BookmarkList from '../components/BookmarkList.vue';

const bookStore = useBookStore();
const themeStore = useThemeStore();
const bookmarkStore = useBookmarkStore();

const bookData = computed(() => bookStore.currentBookData);
const readerViewRef = ref(null);
const paragraphsContainerRef = ref(null);
const paragraphRefs = ref([]);

let observer = null;
let debounceTimer = null;

onBeforeUpdate(() => {
  paragraphRefs.value = [];
});

async function initializeScrollRestoration() {
  if (bookData.value && bookData.value.id) {
    const restoredIndex = await bookStore.restoreProgressFromDB(bookData.value.id);
    if (restoredIndex > 0) {
      scrollToParagraph(restoredIndex, 'auto');
    }
  }
}

function scrollToParagraph(index, behavior = 'smooth') {
  nextTick(() => {
    const targetParagraph = paragraphRefs.value[index];
    if (targetParagraph && readerViewRef.value) {
      const offsetTop = targetParagraph.offsetTop - readerViewRef.value.offsetTop;
      readerViewRef.value.scrollTo({
        top: offsetTop,
        behavior: behavior
      });
    }
  });
}

watch(bookData, async (newData, oldData) => {
  if (newData && (!oldData || newData.id !== oldData.id)) {
    await nextTick();
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(newData.id);
  } else if (!newData && oldData) {
    if (observer) observer.disconnect();
    bookmarkStore.clearCurrentBookBookmarks();
  }
}, { immediate: false });

const handleScroll = () => {
  if (!paragraphsContainerRef.value || !bookData.value || !bookData.value.id) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    bookStore.updateReadingProgress(bookData.value.id, bookStore.currentParagraphIndex);
  }, 500);
};

function setupIntersectionObserver() {
  if (observer) {
    observer.disconnect();
  }
  if (!readerViewRef.value || !paragraphRefs.value || paragraphRefs.value.length === 0) {
    return;
  }

  const options = {
    root: readerViewRef.value,
    rootMargin: '0px',
    threshold: 0.5
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const paragraphId = entry.target.id;
        const index = parseInt(paragraphId.split('-')[1]);
        bookStore.currentParagraphIndex = index;
      }
    });
  }, options);

  paragraphRefs.value.forEach(p => {
    if (p) observer.observe(p);
  });
}

onMounted(async () => {
  if (bookData.value) {
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(bookData.value.id);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearTimeout(debounceTimer);
});

async function goBackToLibrary() {
  await bookStore.deselectBook();
}

async function addCurrentPageBookmark() {
  if (!bookData.value || !bookData.value.id) {
    alert('Cannot add bookmark: No book loaded.');
    return;
  }
  const paragraphIndex = bookStore.currentParagraphIndex;
  try {
    await bookmarkStore.addBookmark({
      bookId: bookData.value.id,
      paragraphIndex: paragraphIndex,
    });
    alert(`Bookmarked Paragraph ${paragraphIndex + 1}`);
  } catch (error) {
    alert('Failed to add bookmark. See console for details.');
    console.error("Error adding bookmark from ReaderView:", error);
  }
}
</script>

<style scoped>
.reader-view {
  padding-top: 0;
  color: var(--text-color);
  overflow-y: auto;
  height: calc(100vh - (var(--header-height, 60px) + var(--footer-height, 60px) + var(--controls-height, 50px)));
  position: relative;
  background-color: var(--reader-bg-color, var(--bg-color));
}

.reader-appearance-white {
  --reader-bg-color: #ffffff;
  --reader-text-color: #222222;
}

.reader-appearance-sepia {
  --reader-bg-color: #fbf0d9;
  --reader-text-color: #5b4636;
}

.reader-appearance-dark_reader {
  --reader-bg-color: #121212;
  --reader-text-color: #e0e0e0;
}

.reader-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
}

.back-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  opacity: 0.9;
}

.bookmark-button {
  background-color: var(--button-bg);
  color: var(--button-text);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}

.bookmark-button:hover {
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
  color: var(--reader-text-color);
}

.book-content .author {
  font-style: italic;
  color: var(--reader-text-color);
  margin-bottom: 1rem;
  text-align: center;
  opacity: 0.85;
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
  color: var(--reader-text-color);
}

.book-paragraph {
  padding-bottom: 10px;
}
</style> 
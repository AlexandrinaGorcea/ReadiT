<template>
  <div 
    class="reader-view-wrapper" 
    ref="readerViewRef" 
    @scroll.passive="handleScroll"
    :class="[themeStore.readerAppearanceClass]" 
    :style="{ 
      fontSize: themeStore.readerFontSize,
      '--dynamic-highlight-bg-color': themeStore.currentHighlightColorHex 
    }"
  >
    <ReaderControls />
    <div class="reader-content-area">
      <div class="reader-actions">
          <button @click="goBackToLibrary" class="back-button">&larr; Back to Library</button>
          <button @click="addCurrentParagraphBookmark" class="bookmark-button" title="Bookmark current paragraph">&#128278; Bookmark</button> 
      </div>
      
      <div 
        v-show="currentSelection.text" 
        class="highlight-tooltip" 
        :style="{ top: currentSelection.tooltipPosition.y + 'px', left: currentSelection.tooltipPosition.x + 'px' }"
      >
        <button @click="createHighlightFromSelection">
          <span class="highlight-icon">✏️</span> 
          Highlight text
        </button>
      </div>

      <div v-if="bookStore.isLoadingBook" class="loading">
        <p>Loading book content...</p>
      </div>
      <div v-else-if="bookStore.bookError" class="error">
        <p>{{ bookStore.bookError }}</p>
      </div>
      <div v-else-if="bookData && bookData.paragraphs" class="book-content-actual">
        <div class="book-meta-reader">
          <h2>{{ bookData.title }}</h2>
          <p class="author">By: {{ bookData.author }} ({{ bookData.year }})</p>
          <img 
            v-if="bookData.coverImage" 
            :src="bookData.coverImage" 
            :alt="`Cover of ${bookData.title}`" 
            class="cover-image-reader"
          >
        </div>

        <div 
          class="paragraphs-container" 
          ref="paragraphsContainerRef"
          @mouseup="handleTextSelection"
          @touchend="handleTextSelection"
        >
          <p 
            v-for="(paragraph, index) in processedParagraphs" 
            :key="index" 
            :ref="el => { if (el) paragraphRefs[index] = el }"
            :id="`paragraph-${index}`"
            class="book-paragraph"
            v-html="paragraph"
          ></p>
        </div>
        
        <BookmarkList @navigate-to-paragraph="scrollToParagraph" />
      </div>
      <div v-else class="no-book-selected">
        <p>No book selected, or book data is missing paragraphs.</p>
      </div>
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
import { useRouter } from 'vue-router';

const props = defineProps({
  bookId: String
});

const bookStore = useBookStore();
const themeStore = useThemeStore();
const bookmarkStore = useBookmarkStore();
const router = useRouter();

const bookData = computed(() => bookStore.currentBookData);
const readerViewRef = ref(null); // For the main scrollable wrapper
const paragraphsContainerRef = ref(null); // For text selection context
const paragraphRefs = ref([]); // To hold refs to individual <p> elements

// Text selection state
const currentSelection = ref({
  text: null,
  paragraphIndex: -1,
  startOffset: -1,
  endOffset: -1,
  tooltipPosition: { x: 0, y: 0 },
  rawSelection: null
});

let observer = null; // IntersectionObserver
let debounceTimer = null; // For debouncing scroll progress saving

onBeforeUpdate(() => {
  paragraphRefs.value = []; // Clear refs before each update
});

watch(() => props.bookId, async (newBookId, oldBookId) => {
  if (newBookId && newBookId !== oldBookId) {
    await bookStore.selectBook(newBookId);
    // Scroll restoration and observer setup will be handled by bookData watcher
  } else if (newBookId && !oldBookId && !bookStore.currentBookData) {
    // Initial load via prop
    await bookStore.selectBook(newBookId);
  }
}, { immediate: true });

watch(bookData, async (newData, oldData) => {
  if (newData && (!oldData || newData.id !== oldData.id)) {
    await nextTick(); // Ensure DOM is updated
    currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null };
    await initializeScrollAndObserver();
    await bookmarkStore.loadBookmarks(newData.id);
  } else if (!newData && oldData) { // Book deselected
    if (observer) observer.disconnect();
    bookmarkStore.clearCurrentBookBookmarks();
    currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null };
  }
}, { deep: true });


async function initializeScrollAndObserver() {
  const currentBookId = bookData.value?.id;
  if (currentBookId) {
    const restoredIndex = await bookStore.restoreProgressFromDB(currentBookId);
    if (restoredIndex > 0 && paragraphRefs.value[restoredIndex]) {
       // Ensure paragraphRefs is populated before scrolling
      await nextTick();
      scrollToParagraph(restoredIndex, 'auto');
    } else if (paragraphRefs.value[0]) {
      // Fallback: scroll to the beginning if no progress or invalid index
      await nextTick();
      scrollToParagraph(0, 'auto');
    }
    setupIntersectionObserver();
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

const handleScroll = () => {
  if (!paragraphsContainerRef.value || !bookData.value || !bookData.value.id) return;
  currentSelection.value.text = null; // Hide tooltip on scroll

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (bookStore.currentParagraphIndex !== undefined) { // Check if defined
       bookStore.updateReadingProgress(bookData.value.id, bookStore.currentParagraphIndex);
    }
  }, 500);
};

function setupIntersectionObserver() {
  if (observer) {
    observer.disconnect();
  }
  currentSelection.value.text = null; 
  if (!readerViewRef.value || !paragraphRefs.value || paragraphRefs.value.length === 0) {
    return;
  }

  const options = {
    root: readerViewRef.value, 
    rootMargin: '0px 0px -80% 0px', // Adjust rootMargin: top, right, bottom, left. -80% means 20% from top is active.
    threshold: 0.1 // Trigger when 10% of paragraph is visible near the top 20% of viewport
  };

  observer = new IntersectionObserver((entries) => {
    let topVisibleEntry = null;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!topVisibleEntry || entry.target.offsetTop < topVisibleEntry.target.offsetTop) {
            topVisibleEntry = entry;
        }
      }
    });
    if (topVisibleEntry) {
        const paragraphId = topVisibleEntry.target.id;
        const index = parseInt(paragraphId.split('-')[1]);
        if (!isNaN(index)) {
            bookStore.currentParagraphIndex = index; // Update store
        }
    }
  }, options);

  paragraphRefs.value.forEach(p => {
    if (p) observer.observe(p);
  });
}

function getParagraphIndexAndOffsets(range) {
  if (!paragraphsContainerRef.value || !range.commonAncestorContainer) return null;

  let node = range.startContainer;
  let paragraphElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  
  while (paragraphElement && (!paragraphElement.id || !paragraphElement.id.startsWith('paragraph-'))) {
    if (paragraphElement === paragraphsContainerRef.value) return null; // Boundary check
    paragraphElement = paragraphElement.parentElement;
  }

  if (!paragraphElement || !paragraphElement.id || !paragraphElement.id.startsWith('paragraph-')) return null;
  
  const paragraphIndex = parseInt(paragraphElement.id.split('-')[1]);
  if (isNaN(paragraphIndex)) return null;

  // Simplified offset calculation: relative to the start of the paragraph's text content.
  // This is a basic version and might not perfectly handle complex HTML within paragraphs.
  let startOffset = 0;
  let endOffset = 0;

  const clonedRange = range.cloneRange();
  clonedRange.selectNodeContents(paragraphElement);
  clonedRange.setEnd(range.startContainer, range.startOffset);
  startOffset = clonedRange.toString().length;

  clonedRange.selectNodeContents(paragraphElement);
  clonedRange.setEnd(range.endContainer, range.endOffset);
  endOffset = clonedRange.toString().length;
  
  return {
    paragraphIndex,
    startOffset: Math.min(startOffset, endOffset),
    endOffset: Math.max(startOffset, endOffset),
  };
}


function handleTextSelection(event) { 
  setTimeout(() => { // Ensure selection object is updated
    const selection = window.getSelection(); 
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (!event.target.closest('.highlight-tooltip')) { // Don't clear if clicking tooltip
         currentSelection.value.text = null;
      }
      return;
    }
  
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
  
    if (!selectedText) {
      currentSelection.value.text = null;
      return;
    }
    
    const selectionDetails = getParagraphIndexAndOffsets(range);

    if (selectionDetails) {
      currentSelection.value = {
        text: selectedText,
        paragraphIndex: selectionDetails.paragraphIndex,
        startOffset: selectionDetails.startOffset,
        endOffset: selectionDetails.endOffset,
        tooltipPosition: { x: event.clientX - 50, y: event.clientY - 70 }, // Adjust as needed
        rawSelection: selection 
      };
    } else {
      currentSelection.value.text = null; // Invalid selection
    }
  }, 0);
}

async function createHighlightFromSelection() {
  if (!currentSelection.value || !currentSelection.value.text || currentSelection.value.paragraphIndex === -1) {
    alert('No valid text selected or paragraph context missing.');
    return;
  }
  if (!bookData.value || !bookData.value.id) {
    alert('Cannot create highlight: No book loaded.');
    return;
  }

  try {
    await bookmarkStore.addBookmark({
      bookId: bookData.value.id,
      paragraphIndex: currentSelection.value.paragraphIndex,
      highlightedText: currentSelection.value.text,
      startOffset: currentSelection.value.startOffset,
      endOffset: currentSelection.value.endOffset,
      type: 'highlight',
    });
    alert(`Text highlighted in paragraph ${currentSelection.value.paragraphIndex + 1}`);
    currentSelection.value.text = null; 
    if (window.getSelection) window.getSelection().removeAllRanges();
  } catch (error) {
    alert('Failed to create highlight. See console.');
    console.error("Error creating highlight:", error);
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, function (match) {
    const Mymap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return Mymap[match];
  });
}

function applyHighlightsToParagraph(paragraphText, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(paragraphText);
  }
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  
  let result = '';
  let lastIndex = 0;
  
  sortedHighlights.forEach(h => {
    if (h.startOffset > lastIndex) {
      result += escapeHtml(paragraphText.substring(lastIndex, h.startOffset));
    }
    const highlightedContent = escapeHtml(paragraphText.substring(h.startOffset, h.endOffset));
    result += `<span class="highlighted-text">${highlightedContent}</span>`;
    lastIndex = h.endOffset;
  });
  
  if (lastIndex < paragraphText.length) {
    result += escapeHtml(paragraphText.substring(lastIndex));
  }
  return result;
}

const processedParagraphs = computed(() => {
  if (!bookStore.currentBookParagraphs || bookStore.currentBookParagraphs.length === 0) {
    return [];
  }
  return bookStore.currentBookParagraphs.map((paragraph, index) => {
    const paragraphHighlights = bookmarkStore.highlightsForParagraph(index);
    return applyHighlightsToParagraph(paragraph, paragraphHighlights);
  });
});

watch(() => bookmarkStore.currentBookBookmarks, () => {
  // This will trigger re-computation of processedParagraphs when bookmarks change
}, { deep: true });


onMounted(async () => {
  // Initial book load and observer setup is handled by watchers
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  clearTimeout(debounceTimer);
  document.removeEventListener('click', handleClickOutside);
  currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null };
});

// Dismiss tooltip when clicking outside
function handleClickOutside(event) {
  if (currentSelection.value.text && !event.target.closest('.highlight-tooltip') && !event.target.closest('.paragraphs-container')) {
    const selection = window.getSelection();
    if (selection.isCollapsed) { // Only hide if selection is also collapsed
        currentSelection.value.text = null;
    }
  }
}

async function goBackToLibrary() {
  router.push({ name: 'Library' });
}

async function addCurrentParagraphBookmark() {
  if (!bookData.value || !bookData.value.id || bookStore.currentParagraphIndex === undefined) {
    alert('Cannot add bookmark: No book loaded or current paragraph unknown.');
    return;
  }
  try {
    await bookmarkStore.addBookmark({
      bookId: bookData.value.id,
      paragraphIndex: bookStore.currentParagraphIndex,
      type: 'bookmark'
    });
    alert(`Bookmarked Paragraph ${bookStore.currentParagraphIndex + 1}`);
  } catch (error) {
    alert('Failed to add bookmark. See console for details.');
    console.error("Error adding bookmark from ReaderView:", error);
  }
}

</script>

<style scoped>
/* Styles from Phase 15 or similar paragraph-based reader */
.reader-view-wrapper {
  padding-top: var(--header-height, 60px); /* Assuming header/controls height */
  color: var(--reader-text-color);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%; 
  overflow-y: auto; /* Main scroll is on this wrapper */
}

.reader-content-area {
  flex-grow: 1;
  /* No overflow-y here, wrapper handles scroll */
  background-color: var(--reader-bg-color);
  padding: 1rem;
}

.reader-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0; /* Reduced padding from original for page view */
  margin-bottom: 1rem;
}

.back-button,
.bookmark-button {
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid transparent;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.back-button:hover,
.bookmark-button:hover {
  background-color: var(--secondary-color); /* A subtle hover */
  border-color: var(--border-color);
}

.loading,
.error,
.no-book-selected {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
  color: var(--reader-text-color);
}

.error p { color: #d32f2f; }

.book-content-actual {
  padding: 0 1rem;
}

.book-meta-reader { /* Re-added styling for consistency */
  text-align: center;
  margin-bottom: 1.5rem;
}

.cover-image-reader { /* Re-added styling */
  display: block;
  max-width: 180px;
  height: auto;
  margin: 0.5rem auto 1rem auto;
  border-radius: 4px;
  border: 1px solid var(--cover-border);
  box-shadow: 0 2px 8px var(--cover-shadow);
}

.paragraphs-container p.book-paragraph {
  margin-bottom: 1.2em;
  line-height: 1.7; /* From original paragraph style */
  text-align: justify;
  font-family: var(--reader-font-family, 'Georgia', serif); /* Ensure font is applied */
}

.highlight-tooltip {
  position: fixed; /* Use fixed if it should overlay scroll */
  background-color: var(--tooltip-bg, #333);
  color: var(--tooltip-text, white);
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  border: none;
  z-index: 1000; /* Ensure it's above other content */
  transform: translate(-50%, -100%); /* Position above cursor/selection */
  transition: opacity 0.2s;
}

.highlight-tooltip button {
  background-color: var(--tooltip-button-bg, var(--primary-color));
  color: var(--tooltip-button-text, white);
  border: none;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}
.highlight-tooltip button:hover {
  filter: brightness(110%);
}
.highlight-tooltip .highlight-icon { font-size: 1em; }

:deep(.highlighted-text) { /* Keep :deep if ReaderControls styles are global */
  background-color: var(--dynamic-highlight-bg-color, rgba(255, 255, 0, 0.35));
  border-radius: 3px;
  padding: 0.05em 0.2em;
  cursor: pointer;
}
:deep(.highlighted-text:hover) {
  filter: brightness(110%);
}
</style> 
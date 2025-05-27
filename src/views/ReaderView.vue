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
          <button @click="addCurrentPageBookmark" class="bookmark-button" title="Bookmark this page">&#128278; Bookmark</button> 
      </div>
      
      <!-- Tooltip that appears near selection -->
      <div 
        v-show="currentSelection.text" 
        class="highlight-tooltip" 
        :style="{ top: currentSelection.tooltipPosition.y + 'px', left: currentSelection.tooltipPosition.x + 'px' }"
      >
        <button @click="createHighlight">
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
      <div v-else-if="bookData" class="book-content-actual">
        <h2>{{ bookData.title }}</h2>
        <p class="author">By: {{ bookData.author }} ({{ bookData.year }})</p>
        <img 
          v-if="bookData.coverImage" 
          :src="bookData.coverImage" 
          :alt="`Cover of ${bookData.title}`" 
          class="cover-image"
        >
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
        <p>No book selected, or book data is missing.</p>
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
const readerViewRef = ref(null);
const paragraphsContainerRef = ref(null);
const paragraphRefs = ref([]);

// Initialize currentSelection
const currentSelection = ref({
  text: null,
  paragraphIndex: -1,
  startOffset: -1,
  endOffset: -1,
  tooltipPosition: { x: 0, y: 0 },
  rawSelection: null
});

let observer = null;
let debounceTimer = null;

onBeforeUpdate(() => {
  paragraphRefs.value = [];
});

async function initializeScrollRestoration() {
  const currentBookId = props.bookId || (bookData.value ? bookData.value.id : null);
  if (currentBookId) {
    const restoredIndex = await bookStore.restoreProgressFromDB(currentBookId);
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

watch(() => props.bookId, async (newBookId, oldBookId) => {
  if (newBookId && newBookId !== oldBookId) {
    await bookStore.selectBook(newBookId);
  }
}, { immediate: true });

watch(bookData, async (newData, oldData) => {
  if (newData && (!oldData || newData.id !== oldData.id)) {
    await nextTick();
    currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null }; // Reset selection
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(newData.id);
  } else if (!newData && oldData) {
    if (observer) {
      observer.disconnect();
    }
    bookmarkStore.clearCurrentBookBookmarks();
    currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null }; // Reset selection
  }
}, { immediate: false });

const handleScroll = () => {
  if (!paragraphsContainerRef.value || !bookData.value || !bookData.value.id) return;
  currentSelection.value.text = null; // Hide tooltip on scroll

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    bookStore.updateReadingProgress(bookData.value.id, bookStore.currentParagraphIndex);
  }, 500);
};

function setupIntersectionObserver() {
  if (observer) {
    observer.disconnect();
  }
  currentSelection.value.text = null; // Hide tooltip when observer re-initializes
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

// Define click handler as a named function for proper cleanup
function handleClickOutside(event) {
  // Skip if the target is within the tooltip or we have no active selection
  if (event.target.closest('.highlight-tooltip') || !currentSelection.value.text) {
    return;
  }
  
  // Clear selection when clicking outside of the tooltip
  const selection = window.getSelection();
  if (selection.rangeCount > 0 && selection.toString().trim().length === 0) {
    currentSelection.value.text = null;
  }
}

onMounted(async () => {
  if (props.bookId && (!bookData.value || bookData.value.id !== props.bookId)) {
    await bookStore.selectBook(props.bookId);
  }
  if (bookData.value) {
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(bookData.value.id);
  }
  document.addEventListener('selectionchange', handleSelectionChange);
  
  // Add event listener to dismiss tooltip when clicking elsewhere
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearTimeout(debounceTimer);
  document.removeEventListener('selectionchange', handleSelectionChange);
  document.removeEventListener('click', handleClickOutside);
  currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null };
});

async function goBackToLibrary() {
  router.push({ name: 'Library' });
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

function getParagraphIndexFromNode(node) {
  let parentElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (parentElement && (!parentElement.id || !parentElement.id.startsWith('paragraph-'))) {
    if (parentElement === paragraphsContainerRef.value || parentElement === readerViewRef.value) return -1; // Boundary
    parentElement = parentElement.parentElement;
  }
  if (parentElement && parentElement.id && parentElement.id.startsWith('paragraph-')) {
    return parseInt(parentElement.id.split('-')[1]);
  }
  return -1;
}

// Debounce selection change events
let selectionChangeDebounceTimer = null;
function handleSelectionChange() {
    clearTimeout(selectionChangeDebounceTimer);
    selectionChangeDebounceTimer = setTimeout(() => {
        // Selection change is observed but main logic is in mouseup/touchend
    }, 200); 
}

/**
 * Handles text selection via mouseup or touchend events
 * Uses setTimeout(0) to ensure the selection state is fully processed by the browser
 * before we attempt to read it. This solves timing issues with the Selection API.
 */
function handleTextSelection(event) { 
  // Defer processing to next event loop tick to ensure selection is fully available
  setTimeout(() => {
    const selection = window.getSelection(); 
    
    if (!paragraphsContainerRef.value) {
      currentSelection.value.text = null;
      return;
    }
  
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // Only clear if not from a click on the tooltip itself
      if (!event || !event.target || !event.target.closest('.highlight-tooltip')) {
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
    
    console.log("Selection detected:", selectedText);
    
    if (!paragraphsContainerRef.value.contains(range.commonAncestorContainer)) {
        currentSelection.value.text = null;
        return;
    }
  
    const startNode = range.startContainer;
    const endNode = range.endContainer;
  
    const startParagraphElement = startNode.nodeType === Node.TEXT_NODE ? startNode.parentElement : startNode;
    const endParagraphElement = endNode.nodeType === Node.TEXT_NODE ? endNode.parentElement : endNode;
  
    if (!startParagraphElement || 
        startParagraphElement !== endParagraphElement || 
        !startParagraphElement.id || 
        !startParagraphElement.id.startsWith('paragraph-') ||
        startParagraphElement.parentElement !== paragraphsContainerRef.value ) {
      currentSelection.value.text = null;
      return;
    }
    
    const paragraphElement = startParagraphElement;
    const paragraphIdParts = paragraphElement.id.split('-');
    const paragraphIndex = parseInt(paragraphIdParts[1]);
  
    if (isNaN(paragraphIndex)) {
      currentSelection.value.text = null;
      return;
    }

    // Calculate offsets relative to the paragraph's text content
    let charCountUpToStart = 0;
    let foundStart = false;
    for (const childNode of paragraphElement.childNodes) {
      if (childNode === range.startContainer || childNode.contains(range.startContainer)) {
        let offsetWithinNode = 0;
        if (childNode === range.startContainer) {
          offsetWithinNode = range.startOffset;
        } else {
          // Handle nested nodes
          if (range.startContainer.nodeType === Node.TEXT_NODE && childNode.contains(range.startContainer)){
            let currentSubNode = childNode.firstChild;
            while(currentSubNode !== range.startContainer && currentSubNode !== null){
              offsetWithinNode += currentSubNode.textContent.length;
              currentSubNode = currentSubNode.nextSibling;
            }
            if(currentSubNode === range.startContainer) offsetWithinNode += range.startOffset;
          } else {
            offsetWithinNode = range.startOffset;
          }
        }
        charCountUpToStart += offsetWithinNode;
        foundStart = true;
        break;
      }
      charCountUpToStart += childNode.textContent.length;
    }
    if (!foundStart && range.startContainer === paragraphElement) charCountUpToStart = range.startOffset;

    let charCountUpToEnd = 0;
    let foundEnd = false;
    for (const childNode of paragraphElement.childNodes) {
      if (childNode === range.endContainer || childNode.contains(range.endContainer)) {
        let offsetWithinNode = 0;
        if (childNode === range.endContainer) {
          offsetWithinNode = range.endOffset;
        } else {
          // Handle nested nodes
          if (range.endContainer.nodeType === Node.TEXT_NODE && childNode.contains(range.endContainer)){
            let currentSubNode = childNode.firstChild;
            while(currentSubNode !== range.endContainer && currentSubNode !== null){
              offsetWithinNode += currentSubNode.textContent.length;
              currentSubNode = currentSubNode.nextSibling;
            }
            if(currentSubNode === range.endContainer) offsetWithinNode += range.endOffset;
          } else {
            offsetWithinNode = range.endOffset;
          }
        }
        charCountUpToEnd += offsetWithinNode;
        foundEnd = true;
        break;
      }
      charCountUpToEnd += childNode.textContent.length;
    }
    if (!foundEnd && range.endContainer === paragraphElement) charCountUpToEnd = range.endOffset;

    const finalStartOffset = Math.min(charCountUpToStart, charCountUpToEnd);
    const finalEndOffset = Math.max(charCountUpToStart, charCountUpToEnd);
    
    currentSelection.value = {
      text: selectedText,
      paragraphIndex: paragraphIndex,
      startOffset: finalStartOffset,
      endOffset: finalEndOffset,
      tooltipPosition: { x: 0, y: 0 },
      rawSelection: selection
    };
    
    // Position tooltip near the selection - improved positioning
    if (event && event.clientX && event.clientY) {
      // Position based on mouse coordinates
      const readerRect = readerViewRef.value.getBoundingClientRect();
      currentSelection.value.tooltipPosition = {
        x: event.clientX - readerRect.left,
        y: Math.max(event.clientY - readerRect.top - 40, 10) // Position slightly higher above cursor
      };
      console.log("Tooltip position set to:", currentSelection.value.tooltipPosition);
    } else {
      // Position based on selection range
      const rect = range.getBoundingClientRect();
      const readerRect = readerViewRef.value.getBoundingClientRect();
      
      currentSelection.value.tooltipPosition = {
        x: rect.left - readerRect.left + (rect.width / 2),
        y: Math.max(rect.top - readerRect.top - 40, 10)  // Position above the selection
      };
      console.log("Tooltip position set to:", currentSelection.value.tooltipPosition);
    }
  }, 0); // End setTimeout - critical for proper selection handling
}

async function createHighlight() {
  if (!currentSelection.value || !currentSelection.value.text || currentSelection.value.paragraphIndex === -1) {
    return;
  }
  if (!bookData.value || !bookData.value.id) {
    return;
  }

  try {
    // Save the highlight in storage
    await bookmarkStore.addBookmark({
      bookId: bookData.value.id,
      paragraphIndex: currentSelection.value.paragraphIndex,
      highlightedText: currentSelection.value.text,
      startOffset: currentSelection.value.startOffset,
      endOffset: currentSelection.value.endOffset,
      type: 'highlight',
    });
    
    // Store position for the success message
    const position = {
      x: currentSelection.value.tooltipPosition.x,
      y: currentSelection.value.tooltipPosition.y
    };
    
    // Clear selection and hide tooltip
    currentSelection.value.text = null; 
    if (window.getSelection) window.getSelection().removeAllRanges();
    
    // Show a brief success confirmation
    const messageElem = document.createElement('div');
    messageElem.className = 'highlight-success-message';
    messageElem.textContent = '✓ Highlight saved';
    messageElem.style.position = 'absolute';
    messageElem.style.left = `${position.x}px`;
    messageElem.style.top = `${position.y}px`;
    messageElem.style.backgroundColor = '#4CAF50';
    messageElem.style.color = 'white';
    messageElem.style.padding = '8px 12px';
    messageElem.style.borderRadius = '8px';
    messageElem.style.opacity = '0.9';
    messageElem.style.transition = 'opacity 0.5s ease';
    messageElem.style.zIndex = '2000';
    messageElem.style.transform = 'translateX(-50%)';
    
    readerViewRef.value.appendChild(messageElem);
    
    // Fade out and remove after a brief delay
    setTimeout(() => {
      messageElem.style.opacity = '0';
      setTimeout(() => {
        if (messageElem.parentNode) {
          messageElem.parentNode.removeChild(messageElem);
        }
      }, 500);
    }, 1500);
  } catch (error) {
    console.error("Error creating highlight:", error);
  }
}

// Utility function to escape HTML special characters to prevent XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Utility function to apply highlights to a paragraph
 * @param {string} paragraphText - The original text of the paragraph
 * @param {Array} highlights - Array of highlight objects with startOffset, endOffset
 * @returns {string} HTML string with highlighted spans
 */
function applyHighlightsToParagraph(paragraphText, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(paragraphText);
  }

  // Sort highlights by startOffset to process them in order
  const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  
  // For debugging
  if (sortedHighlights.length > 0) {
    console.log(`Applying ${sortedHighlights.length} highlights to paragraph: "${paragraphText.substring(0, 30)}..."`);
    console.log('Highlights:', sortedHighlights);
  }
  
  // Check for overlapping highlights and merge them if needed
  const mergedHighlights = [];
  let currentHighlight = {...sortedHighlights[0]};
  
  for (let i = 1; i < sortedHighlights.length; i++) {
    const highlight = sortedHighlights[i];
    
    // If this highlight overlaps with the current one, merge them
    if (highlight.startOffset <= currentHighlight.endOffset) {
      currentHighlight.endOffset = Math.max(currentHighlight.endOffset, highlight.endOffset);
    } else {
      // No overlap, add the current one to our results and move to the next
      mergedHighlights.push(currentHighlight);
      currentHighlight = {...highlight};
    }
  }
  // Add the last highlight
  mergedHighlights.push(currentHighlight);
  
  // Now apply the merged highlights to the text
  let result = '';
  let lastIndex = 0;
  
  mergedHighlights.forEach(h => {
    // Text before the highlight
    if (h.startOffset > lastIndex) {
      result += escapeHtml(paragraphText.substring(lastIndex, h.startOffset));
    }
    
    // The highlighted text
    const highlightedContent = escapeHtml(paragraphText.substring(h.startOffset, h.endOffset));
    result += `<span class="highlighted-text">${highlightedContent}</span>`;
    
    lastIndex = h.endOffset;
  });
  
  // Add any remaining text after the last highlight
  if (lastIndex < paragraphText.length) {
    result += escapeHtml(paragraphText.substring(lastIndex));
  }
  
  return result;
}

// Computed property to process paragraphs and apply highlights
const processedParagraphs = computed(() => {
  if (!bookData.value || !bookData.value.paragraphs) {
    return [];
  }
  
  // Log the number of highlights we have for this book
  console.log(`Processing paragraphs for book ${bookData.value.id}. Total highlights: ${bookmarkStore.highlights.length}`);
  
  return bookData.value.paragraphs.map((paragraph, index) => {
    // Use the new getter for better performance
    const paragraphHighlights = bookmarkStore.highlightsForParagraph(index);
    
    // Apply highlights to the paragraph text
    return applyHighlightsToParagraph(paragraph, paragraphHighlights);
  });
});

// Watch for changes in both the book data and bookmark store
watch(() => bookmarkStore.currentBookBookmarks, () => {
  if (bookData.value && bookData.value.id) {
    // When bookmarks/highlights change, this triggers recomputation of processedParagraphs
    console.log('Highlights/bookmarks updated, reprocessing paragraphs...');
  }
}, { deep: true });
</script>

<style scoped>
.reader-view-wrapper {
  color: var(--reader-text-color);
  position: relative;
  display: flex;
  flex-direction: column;
  /* This wrapper should fill the height allocated by .main-content */
  /* .main-content in App.vue has padding for header/footer, so 100% of that padded space */
  height: 100%; 
}

/* ReaderControls component will take its own height (var(--controls-height)) */
/* Its background is already set to var(--secondary-bg-color) in its own component */

.reader-content-area {
  flex-grow: 1; /* Takes up remaining space after ReaderControls */
  overflow-y: auto; /* This area is scrollable */
  background-color: var(--reader-bg-color);
  padding: 1rem;
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
  --reader-bg-color: #1e1e1e;
  --reader-text-color: #d4d4d4;
}

.reader-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
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
  background-color: var(--secondary-color);
  border-color: var(--border-color);
}

.back-button:active,
.bookmark-button:active {
  background-color: var(--border-color);
}

.loading,
.error,
.no-book-selected {
  text-align: center;
  padding: 2rem;
  font-size: 1.2em;
  color: var(--reader-text-color);
}

.error p {
  color: #d32f2f;
}

.book-content-actual {
  padding: 0 1rem;
}

.book-content-actual h2 {
  margin-bottom: 0.25rem;
  font-size: 1.8em;
  font-weight: 700;
  text-align: center;
  color: var(--reader-text-color);
  line-height: 1.3;
}

.book-content-actual .author {
  font-style: italic;
  font-size: 0.95em;
  color: var(--reader-text-color);
  opacity: 0.75;
  margin-bottom: 1.5rem;
  text-align: center;
}

.book-content-actual .cover-image {
  display: block;
  max-width: 200px;
  height: auto;
  margin: 0 auto 2rem auto;
  border-radius: 6px;
  border: 1px solid var(--cover-border);
  box-shadow: 0 4px 10px var(--cover-shadow);
}

.book-content-actual .paragraphs-container p.book-paragraph {
  margin-bottom: 1.2em;
  line-height: 1.7;
  text-align: justify;
  color: var(--reader-text-color);
  font-family: var(--reader-font-family, 'Georgia', serif);
}

.book-paragraph {
}

.highlight-tooltip {
  position: absolute;
  background-color: var(--tooltip-bg, #333);
  color: var(--tooltip-text, white);
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  border: none;
  z-index: 100;
}

@keyframes tooltipAppear {
  0% { transform: translateX(-50%) translateY(5px); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.highlight-tooltip button {
  background-color: var(--tooltip-button-bg, var(--primary-color));
  color: var(--tooltip-button-text, white);
  border: none;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  font-weight: 500;
}

.highlight-tooltip button:hover {
  background-color: var(--tooltip-button-hover-bg, var(--primary-color));
  filter: brightness(110%);
  transform: none;
}

.highlight-tooltip .highlight-icon {
  font-size: 1em;
}

:deep(.highlighted-text) {
  background-color: var(--dynamic-highlight-bg-color, rgba(255, 255, 0, 0.35));
  border-radius: 3px;
  padding: 0.05em 0.2em;
  cursor: pointer;
  transition: background-color 0.2s ease, filter 0.2s ease;
}

:deep(.highlighted-text:hover) {
  filter: brightness(110%);
}
</style> 
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
    
    <!-- Tooltip that appears near selection -->
    <div 
      v-show="currentSelection.text" 
      class="highlight-tooltip" 
      :style="{ top: currentSelection.tooltipPosition.y + 'px', left: currentSelection.tooltipPosition.x + 'px' }"
    >
      <button @click="createHighlight">Highlight text</button>
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
      <div 
        class="paragraphs-container" 
        ref="paragraphsContainerRef"
        @mouseup="handleTextSelection"
        @touchend="handleTextSelection"
      >
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
    currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null }; // Reset selection
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(newData.id);
  } else if (!newData && oldData) {
    if (observer) observer.disconnect();
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

onMounted(async () => {
  if (bookData.value) {
    await initializeScrollRestoration();
    setupIntersectionObserver();
    await bookmarkStore.loadBookmarks(bookData.value.id);
  }
  document.addEventListener('selectionchange', handleSelectionChange);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  clearTimeout(debounceTimer);
  document.removeEventListener('selectionchange', handleSelectionChange);
  currentSelection.value = { text: null, paragraphIndex: -1, startOffset: -1, endOffset: -1, tooltipPosition: {x:0, y:0}, rawSelection: null };
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
      currentSelection.value.text = null;
      return;
    }
  
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
  
    if (!selectedText) {
      currentSelection.value.text = null;
      return;
    }
    
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
    
    // Position tooltip near the selection
    if (event && event.clientX && event.clientY) {
      // Position near mouse coordinates
      const readerRect = readerViewRef.value.getBoundingClientRect();
      currentSelection.value.tooltipPosition = {
        x: event.clientX - readerRect.left,
        y: Math.max(event.clientY - readerRect.top - 50, 10)
      };
    } else {
      // Position based on selection range
      const rect = range.getBoundingClientRect();
      const readerRect = readerViewRef.value.getBoundingClientRect();
      
      currentSelection.value.tooltipPosition = {
        x: rect.left - readerRect.left + (rect.width / 2),
        y: Math.max(rect.top - readerRect.top - 50, 10)
      };
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

.highlight-tooltip {
  position: absolute;
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.3);
  z-index: 2000;
  cursor: default;
  transform: translateX(-50%);
  opacity: 1;
  transition: opacity 0.2s ease;
  border: 2px solid white;
}

.highlight-tooltip button {
  background-color: white;
  color: #4CAF50;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.highlight-tooltip button:hover {
  background-color: #f0f0f0;
}
</style> 
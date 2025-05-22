<template>
  <div class="bookmark-list-container">
    <h4>Bookmarks</h4>
    <div v-if="bookmarkStore.isLoadingBookmarks" class="loading-bookmarks">
      <p>Loading bookmarks...</p>
    </div>
    <div v-else-if="bookmarkStore.bookmarkError" class="error-bookmarks">
      <p>{{ bookmarkStore.bookmarkError }}</p>
    </div>
    <ul v-else-if="bookmarkStore.currentBookBookmarks.length > 0" class="bookmarks">
      <li v-for="bookmark in bookmarkStore.currentBookBookmarks" :key="bookmark.id" class="bookmark-item">
        <span @click="goToBookmark(bookmark.paragraphIndex)" class="bookmark-link">
          <template v-if="bookmark.type === 'highlight' && bookmark.highlightedText">
            <q class="highlighted-text-preview">{{ truncateText(bookmark.highlightedText, 50) }}</q>
            <small class="timestamp">(P{{ bookmark.paragraphIndex + 1 }} - {{ formatTimestamp(bookmark.createdAt) }})</small>
          </template>
          <template v-else>
            Paragraph {{ bookmark.paragraphIndex + 1 }} 
            <small class="timestamp">({{ formatTimestamp(bookmark.createdAt) }})</small>
          </template>
        </span>
        <button @click="removeBookmark(bookmark.id)" class="delete-bookmark-btn" title="Delete bookmark/highlight">&times;</button>
      </li>
    </ul>
    <div v-else class="no-bookmarks">
      <p>No bookmarks for this book yet.</p>
    </div>
  </div>
</template>

<script setup>
import { useBookmarkStore } from '../stores/bookmarkStore';

const bookmarkStore = useBookmarkStore();

const emit = defineEmits(['navigate-to-paragraph']);

function goToBookmark(paragraphIndex) {
  emit('navigate-to-paragraph', paragraphIndex);
}

async function removeBookmark(bookmarkId) {
  if (confirm("Are you sure you want to delete this item?")) {
    await bookmarkStore.deleteBookmark(bookmarkId);
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
</script>

<style scoped>
.bookmark-list-container {
  padding: 0.5rem 1rem;
  background-color: var(--bg-color);
  border-top: 1px solid var(--cover-border);
  margin-top: 1rem; /* Space above if ReaderControls is separate */
}

.bookmark-list-container h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1em;
  color: var(--text-color);
}

.loading-bookmarks,
.error-bookmarks,
.no-bookmarks {
  font-size: 0.9em;
  color: var(--text-color);
  opacity: 0.8;
  padding: 0.5rem 0;
}

.error-bookmarks p {
  color: red;
}

.bookmarks {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px; /* Or adjust as needed */
  overflow-y: auto;
}

.bookmark-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px dashed var(--cover-border);
  font-size: 0.95em;
}

.bookmark-item:last-child {
  border-bottom: none;
}

.bookmark-link {
  color: var(--button-bg); /* Use button color for links, or a specific link color */
  cursor: pointer;
  text-decoration: none;
}

.bookmark-link:hover {
  text-decoration: underline;
}

.bookmark-link .timestamp {
  font-size: 0.8em;
  color: var(--author-text);
  margin-left: 0.5em;
}

.delete-bookmark-btn {
  background: none;
  border: none;
  color: red;
  font-size: 1.3em;
  cursor: pointer;
  padding: 0 0.3rem;
  line-height: 1;
}

.delete-bookmark-btn:hover {
  opacity: 0.7;
}

.highlighted-text-preview {
  font-style: italic;
  color: var(--text-color); /* Or a specific highlight preview color */
  margin-right: 0.5em;
}
</style> 
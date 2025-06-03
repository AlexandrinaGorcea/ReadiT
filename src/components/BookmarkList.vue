<template>
  <div class="bookmark-list-container">
    <h4>Bookmarks & Highlights</h4>
    <div v-if="bookmarkStore.isLoadingBookmarks" class="loading-bookmarks">
      <p>Loading...</p>
    </div>
    <div v-else-if="bookmarkStore.bookmarkError" class="error-bookmarks">
      <p>{{ bookmarkStore.bookmarkError }}</p>
    </div>
    <ul v-else-if="bookmarkStore.currentBookBookmarks.length > 0" class="bookmarks">
      <li 
        v-for="bookmark in bookmarkStore.currentBookBookmarks" 
        :key="bookmark.id" 
        class="bookmark-item"
        :class="{ 'highlight-item': bookmark.type === 'highlight' }"
      >
        <span @click="goToBookmark(bookmark.paragraphIndex)" class="bookmark-link">
          <template v-if="bookmark.type === 'highlight' && bookmark.highlightedText">
            <span class="bookmark-icon highlight-icon">&#128396;</span>
            <q class="highlighted-text-preview">{{ truncateText(bookmark.highlightedText, 50) }}</q>
            <small class="timestamp">(P{{ (bookmark.paragraphIndex || 0) + 1 }} - {{ formatTimestamp(bookmark.createdAt) }})</small>
          </template>
          <template v-else>
            <span class="bookmark-icon">&#128278;</span>
            Paragraph {{ (bookmark.paragraphIndex || 0) + 1 }} 
            <small class="timestamp">({{ formatTimestamp(bookmark.createdAt) }})</small>
          </template>
        </span>
        <button @click="removeBookmark(bookmark.id)" class="delete-bookmark-btn" title="Delete bookmark/highlight">&times;</button>
      </li>
    </ul>
    <div v-else class="no-bookmarks">
      <p>No bookmarks or highlights for this book yet.</p>
    </div>
  </div>
</template>

<script setup>
import { useBookmarkStore } from '../stores/bookmarkStore';

const bookmarkStore = useBookmarkStore();

const emit = defineEmits(['navigate-to-paragraph']);

function goToBookmark(paragraphIndex) {
  if (typeof paragraphIndex === 'number') {
    emit('navigate-to-paragraph', paragraphIndex);
  }
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
  padding: 1rem 1.5rem;
  background-color: var(--reader-bg-color);
  color: var(--reader-text-color);
  border-top: 1px solid var(--border-color);
  margin-top: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 -1px 3px rgba(0,0,0,0.05);
}

.bookmark-list-container h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2em;
  font-weight: 600;
  color: var(--reader-text-color);
}

.loading-bookmarks,
.error-bookmarks,
.no-bookmarks {
  font-size: 0.95em;
  color: var(--reader-text-color);
  opacity: 0.7;
  padding: 1rem 0;
  text-align: center;
}

.error-bookmarks p {
  color: #d32f2f;
}

.bookmarks {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
}

.bookmark-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.2rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9em;
  transition: background-color 0.15s ease;
  color: var(--reader-text-color);
}

.bookmark-item:hover {
  background-color: rgba(var(--primary-color-rgb, 0,0,0), 0.1);
}

.bookmark-item:last-child {
  border-bottom: none;
}

.bookmark-link {
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5em;
  flex-grow: 1;
}

.bookmark-link:hover {
  filter: brightness(110%);
}

.bookmark-link .timestamp {
  font-size: 0.85em;
  color: var(--reader-text-color);
  opacity: 0.6;
  margin-left: auto;
  padding-left: 0.5em;
}

.delete-bookmark-btn {
  background: none;
  border: none;
  color: var(--reader-text-color);
  opacity: 0.5;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  line-height: 1;
  border-radius: 4px;
  transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.delete-bookmark-btn:hover {
  opacity: 1;
  background-color: rgba(var(--primary-color-rgb, 0,0,0), 0.15);
  color: #d32f2f;
}

.bookmark-icon {
  opacity: 0.9;
  font-size: 0.9em;
}

.highlight-icon {
  color: var(--primary-color);
}

.highlight-item {
}

.highlighted-text-preview {
  font-style: italic;
  color: var(--reader-text-color);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}
</style> 
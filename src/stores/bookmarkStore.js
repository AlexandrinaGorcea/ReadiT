import { defineStore } from 'pinia';
import dbService from '../dbService';

export const useBookmarkStore = defineStore('bookmark', {
  state: () => ({
    currentBookBookmarks: [], // Bookmarks and highlights for the currently active book
    isLoadingBookmarks: false,
    bookmarkError: null,
  }),
  getters: {
    // Get only items of type 'bookmark'
    bookmarks: (state) => state.currentBookBookmarks.filter(item => !item.type || item.type === 'bookmark'),
    
    // Get only items of type 'highlight'
    highlights: (state) => state.currentBookBookmarks.filter(item => item.type === 'highlight'),
    
    // Get highlights for a specific paragraph
    highlightsForParagraph: (state) => (paragraphIndex) => {
      return state.currentBookBookmarks.filter(
        item => item.type === 'highlight' && item.paragraphIndex === paragraphIndex
      );
    }
  },
  actions: {
    async loadBookmarks(bookId) {
      if (!bookId) {
        this.currentBookBookmarks = [];
        return;
      }
      this.isLoadingBookmarks = true;
      this.bookmarkError = null;
      try {
        // dbService.getBookmarksForBook is now expected to return bookmarks sorted by paragraphIndex
        const bookmarks = await dbService.getBookmarksForBook(bookId);
        // No specific mapping needed here if dbService handles the format correctly
        this.currentBookBookmarks = bookmarks;
      } catch (err) {
        console.error(`Failed to load bookmarks for ${bookId}:`, err);
        this.bookmarkError = 'Failed to load bookmarks.';
        this.currentBookBookmarks = [];
      } finally {
        this.isLoadingBookmarks = false;
      }
    },
    async addBookmark(bookmarkData) { // e.g., { bookId, paragraphIndex, type: 'bookmark' or 'highlight', highlightedText?, startOffset?, endOffset? }
      this.bookmarkError = null;
      try {
        // Ensure paragraphIndex is present for paragraph-based system
        if (typeof bookmarkData.paragraphIndex !== 'number') {
          console.error('Attempted to add bookmark without paragraphIndex', bookmarkData);
          throw new Error('Bookmark data must include a paragraphIndex.');
        }

        const newBookmark = await dbService.addBookmark(bookmarkData);
        if (newBookmark && newBookmark.bookId === bookmarkData.bookId) {
            // Add to local store and re-sort (dbService already sorted, but if adding locally, good to maintain order)
            this.currentBookBookmarks.push(newBookmark);
            this.currentBookBookmarks.sort((a, b) => {
              const paragraphDiff = (a.paragraphIndex || 0) - (b.paragraphIndex || 0);
              if (paragraphDiff !== 0) return paragraphDiff;
              if (a.type === 'highlight' && b.type === 'highlight') {
                return (a.startOffset || 0) - (b.startOffset || 0);
              }
              return 0;
            });
        }
        return newBookmark;
      } catch (err) {
        console.error('Failed to add bookmark in store:', err);
        this.bookmarkError = 'Failed to add bookmark.';
        throw err;
      }
    },
    async deleteBookmark(bookmarkId) {
      this.bookmarkError = null;
      try {
        await dbService.deleteBookmark(bookmarkId);
        this.currentBookBookmarks = this.currentBookBookmarks.filter(b => b.id !== bookmarkId);
      } catch (err) {
        console.error(`Failed to delete bookmark ${bookmarkId} in store:`, err);
        this.bookmarkError = 'Failed to delete bookmark.';
        throw err;
      }
    },
    clearCurrentBookBookmarks() {
        this.currentBookBookmarks = [];
    }
  },
}); 
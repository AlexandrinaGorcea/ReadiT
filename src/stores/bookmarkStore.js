import { defineStore } from 'pinia';
import dbService from '../dbService';

export const useBookmarkStore = defineStore('bookmark', {
  state: () => ({
    currentBookBookmarks: [], // Bookmarks for the currently active book
    isLoadingBookmarks: false,
    bookmarkError: null,
  }),
  actions: {
    async loadBookmarks(bookId) {
      if (!bookId) {
        this.currentBookBookmarks = [];
        return;
      }
      this.isLoadingBookmarks = true;
      this.bookmarkError = null;
      try {
        const bookmarks = await dbService.getBookmarksForBook(bookId);
        this.currentBookBookmarks = bookmarks;
      } catch (err) {
        console.error(`Failed to load bookmarks for ${bookId}:`, err);
        this.bookmarkError = 'Failed to load bookmarks.';
        this.currentBookBookmarks = [];
      } finally {
        this.isLoadingBookmarks = false;
      }
    },
    async addBookmark(bookmarkData) { // { bookId, paragraphIndex, note? }
      this.bookmarkError = null;
      try {
        const newBookmark = await dbService.addBookmark(bookmarkData);
        if (newBookmark && newBookmark.bookId === bookmarkData.bookId) {
            // Add to current list if it belongs to the current book and sort
            this.currentBookBookmarks.push(newBookmark);
            this.currentBookBookmarks.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
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
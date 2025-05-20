import { defineStore } from 'pinia';
import BookService from '../BookService';
import dbService from '../dbService'; // Import dbService
import { useBookmarkStore } from './bookmarkStore'; // Import bookmark store

export const useBookStore = defineStore('book', {
  state: () => ({
    books: [], // List of available books from manifest
    selectedBookId: null,
    currentBookData: null, // Full data of the selected book
    currentParagraphIndex: 0, // Add this for scroll position
    isLoadingManifest: false,
    isLoadingBook: false,
    manifestError: null,
    bookError: null,
  }),
  getters: {
    isBookSelected: (state) => !!state.selectedBookId && !!state.currentBookData,
  },
  actions: {
    async fetchBookManifest() {
      this.isLoadingManifest = true;
      this.manifestError = null;
      try {
        const manifest = await BookService.loadBookManifest();
        this.books = manifest;
      } catch (err) {
        console.error('Failed to load book manifest in store:', err);
        this.manifestError = 'Failed to load book library.';
      } finally {
        this.isLoadingManifest = false;
      }
    },
    async selectBook(bookId) {
      if (this.selectedBookId === bookId && this.currentBookData) {
        // Book already selected, ensure scroll position is from most reliable source
        await this.restoreProgressFromDB(bookId); // Prioritize DB for re-selection
        return;
      }

      // If switching from another book, save its progress to DB
      if (this.selectedBookId && this.currentBookData && this.selectedBookId !== bookId) {
        const lastKnownIndex = parseInt(localStorage.getItem(`readit-progress-${this.selectedBookId}`) || this.currentParagraphIndex.toString(), 10);
        await dbService.saveReadingState(this.selectedBookId, lastKnownIndex);
        // Clear bookmarks for the old book
        const bookmarkStore = useBookmarkStore();
        bookmarkStore.clearCurrentBookBookmarks();
      }

      this.selectedBookId = bookId;
      this.currentBookData = null;
      this.currentParagraphIndex = 0; // Default, will be overridden by DB/LS
      this.isLoadingBook = true;
      this.bookError = null;

      try {
        const bookData = await BookService.loadBookById(bookId);
        this.currentBookData = bookData;
        await this.restoreProgressFromDB(bookId); // Restore progress for the newly selected book
        // Load bookmarks for the newly selected book
        const bookmarkStore = useBookmarkStore();
        await bookmarkStore.loadBookmarks(bookId);
      } catch (err) {
        console.error(`Failed to load book ${bookId} in store:`, err);
        this.bookError = `Failed to load book: ${err.message || 'Unknown error'}`;
        this.selectedBookId = null;
      } finally {
        this.isLoadingBook = false;
      }
    },
    async deselectBook() {
      if (this.selectedBookId && this.currentBookData) {
        // Save final progress from LocalStorage (most up-to-date for session) to IndexedDB
        const lastKnownIndex = parseInt(localStorage.getItem(`readit-progress-${this.selectedBookId}`) || this.currentParagraphIndex.toString(), 10);
        await dbService.saveReadingState(this.selectedBookId, lastKnownIndex);
        localStorage.removeItem(`readit-progress-${this.selectedBookId}`); // Clear LS for this book
      }
      this.selectedBookId = null;
      this.currentBookData = null;
      this.currentParagraphIndex = 0;
      this.bookError = null;
      // Clear bookmarks when no book is selected
      const bookmarkStore = useBookmarkStore();
      bookmarkStore.clearCurrentBookBookmarks();
    },

    // LocalStorage for frequent updates within a session
    saveProgressToLocalStorage(bookId, paragraphIndex) {
      if (!bookId) return;
      localStorage.setItem(`readit-progress-${bookId}`, paragraphIndex.toString());
      this.currentParagraphIndex = paragraphIndex; // Keep reactive store in sync
    },

    // Restore from LocalStorage (primarily for immediate UI reactivity within session)
    restoreProgressFromLocalStorage(bookId) {
      if (!bookId) return 0;
      const savedIndex = localStorage.getItem(`readit-progress-${bookId}`);
      const index = savedIndex ? parseInt(savedIndex, 10) : 0;
      this.currentParagraphIndex = index;
      return index;
    },

    // Restore from IndexedDB (primary source for starting a session or new book)
    async restoreProgressFromDB(bookId) {
      if (!bookId) {
        this.currentParagraphIndex = 0;
        return 0;
      }
      const state = await dbService.getReadingState(bookId);
      let index = 0;
      if (state) {
        index = state.paragraphIndex;
        console.log(`Restored p${index} for ${bookId} from DB.`);
      } else {
        // If not in DB, try LocalStorage (e.g., if session wasn't cleanly ended)
        index = this.restoreProgressFromLocalStorage(bookId);
        console.log(`Restored p${index} for ${bookId} from LS (DB miss).`);
      }
      this.currentParagraphIndex = index;
      // Ensure LocalStorage is also updated if DB had a more definitive value
      localStorage.setItem(`readit-progress-${bookId}`, index.toString()); 
      return index;
    },

    // Called by ReaderView on scroll/interaction
    updateReadingProgress(bookId, paragraphIndex) {
        this.currentParagraphIndex = paragraphIndex;
        this.saveProgressToLocalStorage(bookId, paragraphIndex); // Frequent save to LS
    }
  },
}); 
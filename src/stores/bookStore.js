import { defineStore } from 'pinia';
import BookService from '../BookService'; // Adjusted path

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
        // Book already selected and loaded
        // We might still want to restore scroll position if it was reset
        this.restoreProgress(bookId);
        return;
      }
      this.selectedBookId = bookId;
      this.currentBookData = null;
      this.currentParagraphIndex = 0; // Reset paragraph index for new book
      this.isLoadingBook = true;
      this.bookError = null;
      try {
        const bookData = await BookService.loadBookById(bookId);
        this.currentBookData = bookData;
        this.restoreProgress(bookId); // Attempt to restore progress after book loads
      } catch (err) {
        console.error(`Failed to load book ${bookId} in store:`, err);
        this.bookError = `Failed to load book: ${err.message || 'Unknown error'}`;
        this.selectedBookId = null; // Deselect on error
      } finally {
        this.isLoadingBook = false;
      }
    },
    deselectBook() {
      // Optionally, save progress before deselecting if you want to keep last position
      // For now, just clearing.
      this.selectedBookId = null;
      this.currentBookData = null;
      this.currentParagraphIndex = 0;
      this.bookError = null;
    },
    saveProgress(bookId, paragraphIndex) {
      if (!bookId) return;
      localStorage.setItem(`readit-progress-${bookId}`, paragraphIndex.toString());
      this.currentParagraphIndex = paragraphIndex;
    },
    restoreProgress(bookId) {
      if (!bookId) return 0;
      const savedIndex = localStorage.getItem(`readit-progress-${bookId}`);
      const index = savedIndex ? parseInt(savedIndex, 10) : 0;
      this.currentParagraphIndex = index;
      return index; // Return for ReaderView to use
    }
  },
}); 
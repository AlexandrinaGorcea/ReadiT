import { defineStore } from 'pinia';
import BookService from '../BookService'; // Adjusted path

export const useBookStore = defineStore('book', {
  state: () => ({
    books: [], // List of available books from manifest
    selectedBookId: null,
    currentBookData: null, // Full data of the selected book
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
        return;
      }
      this.selectedBookId = bookId;
      this.currentBookData = null; // Clear previous book data
      this.isLoadingBook = true;
      this.bookError = null;
      try {
        const bookData = await BookService.loadBookById(bookId);
        this.currentBookData = bookData;
      } catch (err) {
        console.error(`Failed to load book ${bookId} in store:`, err);
        this.bookError = `Failed to load book: ${err.message || 'Unknown error'}`;
        this.selectedBookId = null; // Deselect on error
      } finally {
        this.isLoadingBook = false;
      }
    },
    deselectBook() {
      this.selectedBookId = null;
      this.currentBookData = null;
      this.bookError = null;
    },
  },
}); 
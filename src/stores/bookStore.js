import { defineStore } from 'pinia';
import BookService from '../BookService';
import dbService from '../dbService'; // Import dbService
import { useBookmarkStore } from './bookmarkStore'; // Import bookmark store

export const useBookStore = defineStore('book', {
  state: () => ({
    books: [], // List of available books from manifest
    selectedBookId: null,
    currentBookData: null, // Full data of the selected book { ..., paragraphs: ["text1", "text2", ...] }
    currentParagraphIndex: 0, // Reverted from currentPageIndex
    isLoadingManifest: false,
    isLoadingBook: false,
    manifestError: null,
    bookError: null,
  }),
  getters: {
    isBookSelected: (state) => !!state.selectedBookId && !!state.currentBookData,
    currentBookParagraphs: (state) => {
      return state.currentBookData && Array.isArray(state.currentBookData.paragraphs) 
        ? state.currentBookData.paragraphs 
        : [];
    },
    currentParagraphText: (state) => {
      if (state.currentBookParagraphs.length > state.currentParagraphIndex) {
        return state.currentBookParagraphs[state.currentParagraphIndex];
      }
      return ''; // Return empty string if index is out of bounds or no paragraphs
    },
    totalParagraphs: (state) => {
      return state.currentBookParagraphs.length;
    }
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
        await this.restoreProgressFromDB(bookId);
        return;
      }

      if (this.selectedBookId && this.currentBookData && this.selectedBookId !== bookId) {
        // Save progress for the old book (paragraph-based)
        const lastKnownIndex = parseInt(localStorage.getItem(`readit-paragraph-progress-${this.selectedBookId}`) || this.currentParagraphIndex.toString(), 10);
        await dbService.saveReadingState(this.selectedBookId, lastKnownIndex); // dbService will need to expect paragraphIndex
        const bookmarkStore = useBookmarkStore();
        bookmarkStore.clearCurrentBookBookmarks();
      }

      this.selectedBookId = bookId;
      this.currentBookData = null;
      this.currentParagraphIndex = 0; 
      this.isLoadingBook = true;
      this.bookError = null;

      try {
        const bookData = await BookService.loadBookById(bookId);
        this.currentBookData = bookData; 
        // Ensure currentBookData.paragraphs is an array
        if (!this.currentBookData || !Array.isArray(this.currentBookData.paragraphs)) {
            console.error('Book data loaded is not in the expected paragraph-based format:', this.currentBookData);
            throw new Error('Book data is not in the expected paragraph-based format.');
        }
        await this.restoreProgressFromDB(bookId); 
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
        const lastKnownIndex = parseInt(localStorage.getItem(`readit-paragraph-progress-${this.selectedBookId}`) || this.currentParagraphIndex.toString(), 10);
        await dbService.saveReadingState(this.selectedBookId, lastKnownIndex); // dbService will need to expect paragraphIndex
        localStorage.removeItem(`readit-paragraph-progress-${this.selectedBookId}`);
      }
      this.selectedBookId = null;
      this.currentBookData = null;
      this.currentParagraphIndex = 0;
      this.bookError = null;
      const bookmarkStore = useBookmarkStore();
      bookmarkStore.clearCurrentBookBookmarks();
    },

    saveProgressToLocalStorage(bookId, paragraphIndex) {
      if (!bookId) return;
      localStorage.setItem(`readit-paragraph-progress-${bookId}`, paragraphIndex.toString());
      this.currentParagraphIndex = paragraphIndex;
    },

    restoreProgressFromLocalStorage(bookId) {
      if (!bookId) return 0;
      const savedIndex = localStorage.getItem(`readit-paragraph-progress-${bookId}`);
      const index = savedIndex ? parseInt(savedIndex, 10) : 0;
      // Validate index against total paragraphs if possible, or do it in restoreProgressFromDB
      this.currentParagraphIndex = index; 
      return index;
    },

    async restoreProgressFromDB(bookId) {
      if (!bookId) {
        this.currentParagraphIndex = 0;
        return 0;
      }
      const state = await dbService.getReadingState(bookId); // dbService needs to return paragraphIndex
      let index = 0;
      if (state && typeof state.paragraphIndex === 'number') { // Check for paragraphIndex
        index = state.paragraphIndex;
        console.log(`Restored paragraph ${index} for ${bookId} from DB.`);
      } else {
        index = this.restoreProgressFromLocalStorage(bookId);
        console.log(`Restored paragraph ${index} for ${bookId} from LS (DB miss or old format).`);
      }
      
      // Ensure index is valid for the loaded book
      if (this.currentBookData && this.currentBookData.paragraphs && index >= this.currentBookData.paragraphs.length) {
        console.warn(`Restored paragraph index ${index} is out of bounds for book ${bookId}. Resetting to 0.`);
        index = 0;
      }
      this.currentParagraphIndex = index;
      localStorage.setItem(`readit-paragraph-progress-${bookId}`, index.toString()); 
      return index;
    },

    updateReadingProgress(bookId, paragraphIndex) {
        if (this.currentBookData && this.currentBookData.paragraphs && paragraphIndex >= 0 && paragraphIndex < this.currentBookData.paragraphs.length) {
          this.currentParagraphIndex = paragraphIndex;
          this.saveProgressToLocalStorage(bookId, paragraphIndex);
        } else {
            console.warn(`Attempted to update to invalid paragraph index: ${paragraphIndex}.`);
        }
    },

    goToParagraph(paragraphIndex) {
      if (this.currentBookData && this.currentBookData.paragraphs) {
        const totalParagraphs = this.currentBookData.paragraphs.length;
        if (paragraphIndex >= 0 && paragraphIndex < totalParagraphs) {
          this.currentParagraphIndex = paragraphIndex;
          this.saveProgressToLocalStorage(this.selectedBookId, paragraphIndex);
          // No need to call updateReadingProgress as saveProgressToLocalStorage handles the state and LS update
        } else {
          console.warn(`Attempted to navigate to invalid paragraph index: ${paragraphIndex}. Total paragraphs: ${totalParagraphs}`);
        }
      }
    }
  },
}); 
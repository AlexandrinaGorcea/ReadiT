const BookService = {
  async loadBookById(bookId) {
    try {
      const response = await fetch(`/books/${bookId}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${bookId}.json`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error loading book ${bookId}:`, error);
      throw error;
    }
  },

  async loadBookManifest() {
    try {
      const response = await fetch(`/books/manifest.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for manifest.json`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error loading book manifest:", error);
      throw error;
    }
  }
};

export default BookService; 
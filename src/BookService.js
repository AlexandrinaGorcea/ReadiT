const BookService = {
  async loadBookById(bookId) {
    try {
      const response = await fetch(`/books/${bookId}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error loading book:", error);
      throw error; // Re-throw to allow the component to handle it
    }
  }
};

export default BookService; 
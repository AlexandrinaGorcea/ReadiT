import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: localStorage.getItem('theme') || 'light', // Main app theme: 'light' or 'dark'
    // Reader-specific preferences
    readerFontSize: localStorage.getItem('readerFontSize') || '16px',
    readerAppearance: localStorage.getItem('readerAppearance') || 'white', // 'white', 'sepia', 'dark_reader'
  }),
  getters: {
    // Getter to apply a class to the reader view container for appearance
    readerAppearanceClass: (state) => `reader-appearance-${state.readerAppearance}`,
  },
  actions: {
    // Main app theme
    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('theme', theme);
      document.documentElement.className = `theme-${theme}`; // Apply theme to <html> element
    },
    toggleTheme() {
      const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
    },
    initializeTheme() {
      // Ensure the theme class is applied on initial load
      this.setTheme(this.currentTheme);
      // Also initialize reader-specific settings if they are stored
      this.setReaderFontSize(this.readerFontSize); 
      this.setReaderAppearance(this.readerAppearance);
    },

    // Reader-specific preferences
    setReaderFontSize(size) {
      this.readerFontSize = size;
      localStorage.setItem('readerFontSize', size);
      // Applying font size will be handled by a class or style binding in ReaderView
    },
    setReaderAppearance(appearance) {
      this.readerAppearance = appearance;
      localStorage.setItem('readerAppearance', appearance);
      // Applying appearance class will be handled by a class binding in ReaderView
    },
    // Helper to cycle through font sizes or appearances if needed, or set directly
    // Example: cycleFontSize() { ... }
  },
}); 
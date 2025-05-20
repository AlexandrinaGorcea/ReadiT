import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: localStorage.getItem('theme') || 'light', // Initialize from localStorage or default to light
  }),
  actions: {
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
    }
  },
}); 
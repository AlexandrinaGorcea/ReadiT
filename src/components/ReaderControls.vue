<template>
  <div class="reader-controls">
    <div class="control-group">
      <label for="font-size-select">Font Size:</label>
      <select id="font-size-select" :value="themeStore.readerFontSize" @change="updateFontSize($event.target.value)">
        <option value="14px">Small</option>
        <option value="16px">Medium (Default)</option>
        <option value="18px">Large</option>
        <option value="20px">X-Large</option>
        <option value="22px">XX-Large</option>
      </select>
    </div>
    <div class="control-group">
      <label for="appearance-select">Appearance:</label>
      <select id="appearance-select" :value="themeStore.readerAppearance" @change="updateAppearance($event.target.value)">
        <option value="white">White</option>
        <option value="sepia">Sepia</option>
        <option value="dark_reader">Dark</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from '../stores/themeStore';

const themeStore = useThemeStore();

function updateFontSize(size) {
  themeStore.setReaderFontSize(size);
}

function updateAppearance(appearance) {
  themeStore.setReaderAppearance(appearance);
}
</script>

<style scoped>
.reader-controls {
  display: flex;
  justify-content: center; /* Center groups if they wrap */
  align-items: center;
  gap: 1.5rem; /* Space between control groups */
  padding: 0.75rem 1rem;
  background-color: var(--header-bg); /* Use header background for contrast or a neutral one */
  color: var(--header-text); /* Text color consistent with header */
  border-bottom: 1px solid var(--cover-border);
  margin-bottom: 1rem;
  flex-wrap: wrap; /* Allow controls to wrap on smaller screens */
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* Space between label and select */
}

.control-group label {
  font-size: 0.9em;
  color: var(--header-text); /* Ensure label color matches theme */
}

.control-group select {
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--cover-border);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 0.9em;
}

/* Adjust select appearance for better theme consistency */
.theme-dark .control-group select {
  background-color: var(--bg-color, #333); /* Fallback for dark */
  color: var(--text-color, #e0e0e0);
  border-color: var(--cover-border, #555);
}

.theme-light .control-group select {
    background-color: var(--bg-color, #fff);
    color: var(--text-color, #333);
    border-color: var(--cover-border, #ccc);
}

</style> 
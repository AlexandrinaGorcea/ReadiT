<template>
  <div class="reader-controls">
    <div class="control-group">
      <label for="font-size-select">Font Size:</label>
      <select id="font-size-select" v-model="selectedFontSize" @change="applyFontSize">
        <option value="14px">Small</option>
        <option value="16px">Medium</option>
        <option value="18px">Large</option>
        <option value="20px">X-Large</option>
      </select>
    </div>

    <div class="control-group">
      <label>Appearance:</label>
      <div class="segmented-control appearance-selector">
        <button 
          @click="applyAppearanceChange('white')" 
          :class="{ 'active': selectedAppearance === 'white' }"
          title="White background"
        ><span class="appearance-icon white-icon"></span></button>
        <button 
          @click="applyAppearanceChange('sepia')" 
          :class="{ 'active': selectedAppearance === 'sepia' }"
          class="sepia-btn"
          title="Sepia background"
        ><span class="appearance-icon sepia-icon"></span></button>
        <button 
          @click="applyAppearanceChange('dark_reader')" 
          :class="{ 'active': selectedAppearance === 'dark_reader' }"
          class="dark-btn"
          title="Dark background"
        ><span class="appearance-icon dark-icon"></span></button>
      </div>
    </div>

    <div class="control-group">
      <label>Highlight:</label>
      <div class="highlight-color-options">
        <button 
          v-for="color in themeStore.availableHighlightColors"
          :key="color.name"
          class="color-option"
          :style="{ backgroundColor: color.hex }"
          @click="applyHighlightColor(color.name)"
          :title="`Set highlight to ${color.name}`"
          :class="{ 'selected': themeStore.readerHighlightColor === color.name }"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useThemeStore } from '../stores/themeStore';

const themeStore = useThemeStore();

const selectedAppearance = ref(themeStore.readerAppearance);
const selectedFontSize = ref(themeStore.readerFontSize);

function applyAppearanceChange(appearance) {
  selectedAppearance.value = appearance;
  themeStore.setReaderAppearance(appearance);
}

function applyFontSize() {
  themeStore.setReaderFontSize(selectedFontSize.value);
}

function applyHighlightColor(colorName) {
  themeStore.setReaderHighlightColor(colorName);
}

watch(() => themeStore.readerAppearance, (newVal) => {
  selectedAppearance.value = newVal;
});

watch(() => themeStore.readerFontSize, (newVal) => {
  selectedFontSize.value = newVal;
});
</script>

<style scoped>
.reader-controls {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--secondary-bg-color);
  border-bottom: 1px solid var(--controls-border);
  border-top: none;
  margin-top: 0;
  height: var(--controls-height, 55px);
  box-shadow: none;
  position: relative;
  z-index: 10;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.control-group label {
  font-size: 0.85em;
  color: var(--text-color);
  opacity: 0.85;
}

.control-group select {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--controls-border);
  background-color: var(--secondary-bg-color, var(--bg-color));
  color: var(--text-color);
  font-size: 0.85em;
  line-height: 1;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23333' viewBox='0 0 16 16'%3E%3Cpath d='M8 12L3 7h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 12px 12px;
  padding-right: 1.8rem;
}

html.theme-dark .control-group select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23eee' viewBox='0 0 16 16'%3E%3Cpath d='M8 12L3 7h10l-5 5z'/%3E%3C/svg%3E");
}

.segmented-control {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--controls-border);
}

.segmented-control button {
  padding: 0.4rem 0.8rem;
  border: none;
  background-color: transparent;
  color: var(--text-color);
  font-size: 0.85em;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  border-left: 1px solid var(--controls-border);
}

.segmented-control button:first-child {
  border-left: none;
}

.segmented-control button.active {
  background-color: var(--primary-color);
  color: var(--button-text);
  font-weight: 600;
}

.segmented-control button.sepia-btn.active {
  background-color: #705d4e;
  color: #fbf0d9;
}
html.theme-dark .segmented-control button.sepia-btn.active {
  background-color: #a1887f;
  color: #fbf0d9;
}

.segmented-control button.dark-btn.active {
  background-color: #333;
  color: #e0e0e0;
}
html.theme-dark .segmented-control button.dark-btn.active {
  background-color: #555;
}

.segmented-control button:hover:not(.active) {
  background-color: var(--secondary-color);
}

.highlight-color-options {
  display: flex;
  gap: 0.6rem;
}

.color-option {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.color-option.selected {
  border-color: var(--primary-color);
  transform: scale(1.15);
  box-shadow: 0 0 0 2px var(--bg-color), 0 0 0 4px var(--primary-color);
}

.color-option:hover {
  transform: scale(1.1);
}

.appearance-selector button {
  min-width: 40px;
  text-align: center;
  padding: 0.3rem 0.5rem;
  line-height: 0;
}

.appearance-icon {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid var(--controls-border);
  vertical-align: middle;
}

.appearance-icon.white-icon {
  background-color: #FFFFFF;
}
html.theme-dark .appearance-icon.white-icon {
  border-color: #555;
}

.appearance-icon.sepia-icon {
  background-color: #fbf0d9;
}

.appearance-icon.dark-icon {
  background-color: #1e1e1e;
  border-color: #555;
}

.appearance-selector button.active .white-icon {
  border-color: var(--primary-color);
}
.appearance-selector button.active .sepia-icon {
  border-color: var(--primary-color);
}
.appearance-selector button.active .dark-icon {
  border-color: var(--primary-color);
}
</style> 
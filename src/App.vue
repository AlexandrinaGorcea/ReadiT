<script setup>
// No imports needed for now
</script>

<template>
  <div class="app">
    <header>
      <h1>ReadiT - Book Reader</h1>
    </header>

    <main>
      <p>Welcome to ReadiT, your personal book reading companion!</p>
    </main>

    <footer>
      <p>&copy; 2025 ReadiT App</p>
    </footer>
  </div>
</template>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

footer {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}
</style>

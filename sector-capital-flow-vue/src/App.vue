<template>
  <div id="app-root">
    <SectorCapitalFlow />
  </div>
</template>

<script setup>
import SectorCapitalFlow from './views/SectorCapitalFlow.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #303133;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
#app-root {
  min-height: 100vh;
}
</style>

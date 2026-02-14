<template>
  <div id="app">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<style>
#app {
  min-height: 100vh;
}
</style>

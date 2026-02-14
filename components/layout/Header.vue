<template>
  <header class="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <!-- Mobile menu button -->
    <a-button
      class="lg:hidden"
      type="text"
      size="small"
      @click="$emit('toggleMenu')"
    >
      <template #icon><icon-menu /></template>
    </a-button>

    <!-- Title (mobile) -->
    <div class="lg:hidden font-semibold text-foreground">微信文章导出</div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- WeChat login status -->
    <div class="flex items-center gap-2 mr-3">
      <slot name="wechat-status" />
    </div>

    <!-- Theme toggle -->
    <ThemeToggle />
  </header>
</template>

<script setup lang="ts">
import { IconMenu } from '@arco-design/web-vue/es/icon'
import ThemeToggle from './ThemeToggle.vue'

defineEmits<{
  toggleMenu: []
}>()
</script>

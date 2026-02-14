<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around h-14 border-t border-border bg-background/95 backdrop-blur">
    <NuxtLink
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-muted-foreground transition-colors"
      :class="{ 'text-primary': isActive(item.path) }"
    >
      <component :is="item.icon" class="w-5 h-5" />
      <span class="text-[10px]">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import {
  IconHome, IconUser, IconFile, IconStar, IconSettings,
} from '@arco-design/web-vue/es/icon'

const route = useRoute()

const navItems = [
  { path: '/dashboard', label: '概览', icon: IconHome },
  { path: '/dashboard/account', label: '公众号', icon: IconUser },
  { path: '/dashboard/article', label: '文章', icon: IconFile },
  { path: '/dashboard/favorites', label: '收藏', icon: IconStar },
  { path: '/dashboard/settings', label: '设置', icon: IconSettings },
]

function isActive(path: string): boolean {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}
</script>

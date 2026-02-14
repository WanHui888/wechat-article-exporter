<template>
  <a-dropdown trigger="click" @select="handleSelect">
    <a-button type="text" size="small">
      <template #icon>
        <icon-sun-fill v-if="!isDark" />
        <icon-moon-fill v-else />
      </template>
    </a-button>
    <template #content>
      <a-doption value="light">
        <template #icon><icon-sun-fill /></template>
        浅色
      </a-doption>
      <a-doption value="dark">
        <template #icon><icon-moon-fill /></template>
        深色
      </a-doption>
      <a-doption value="system">
        <template #icon><icon-computer /></template>
        跟随系统
      </a-doption>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { IconSunFill, IconMoonFill, IconComputer } from '@arco-design/web-vue/es/icon'

const { isDark, setTheme } = useTheme()

function handleSelect(value: string | number | Record<string, any> | undefined) {
  setTheme(value as 'light' | 'dark' | 'system')
}
</script>

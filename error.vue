<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-foreground">出了点问题</h1>
        <p class="mt-2 text-muted-foreground">{{ error?.message || '页面加载失败' }}</p>
      </div>
      <div class="flex justify-center gap-4">
        <a-button type="primary" @click="handleError">
          返回首页
        </a-button>
        <a-button @click="clearError({ redirect: '/' })">
          重试
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: any }>()
const { clearError } = useError()

function handleError() {
  clearError({ redirect: '/' })
}
</script>

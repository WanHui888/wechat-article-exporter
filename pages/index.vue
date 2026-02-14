<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="w-full max-w-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-foreground">微信公众号文章导出工具</h1>
        <p class="mt-2 text-muted-foreground">批量下载、管理、导出微信公众号文章</p>
      </div>

      <div class="flex flex-col gap-3">
        <a-button type="primary" size="large" long @click="navigateTo('/login')">
          登录
        </a-button>
        <a-button size="large" long @click="navigateTo('/register')">
          注册
        </a-button>
      </div>

      <div class="mt-8 text-center text-xs text-muted-foreground">
        v3.0.0
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

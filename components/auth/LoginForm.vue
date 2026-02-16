<template>
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-foreground">登录</h1>
      <p class="mt-2 text-sm text-muted-foreground">输入账号密码登录系统</p>
    </div>

    <a-form
      :model="form"
      layout="vertical"
      @submit-success="handleSubmit"
    >
      <a-form-item field="username" label="用户名" :rules="[{ required: true, message: '请输入用户名' }]">
        <a-input v-model="form.username" placeholder="请输入用户名" allow-clear />
      </a-form-item>

      <a-form-item field="password" label="密码" :rules="[{ required: true, message: '请输入密码' }]">
        <a-input-password v-model="form.password" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model="rememberMe">记住账号密码</a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" html-type="submit" long :loading="loading">
          登录
        </a-button>
      </a-form-item>
    </a-form>

    <div class="text-center text-sm text-muted-foreground">
      还没有账号？
      <NuxtLink to="/register" class="text-primary hover:underline">注册</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const STORAGE_KEY = 'remembered_login'

const { login, loading } = useAuth()
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: '',
})

// Load saved credentials on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const { username, password } = JSON.parse(saved)
      form.username = username || ''
      form.password = password || ''
      rememberMe.value = true
    }
  } catch {
    // ignore
  }
})

async function handleSubmit() {
  try {
    await login(form.username, form.password)

    // Save or clear credentials based on checkbox
    if (rememberMe.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        username: form.username,
        password: form.password,
      }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }

    Message.success('登录成功')
    navigateTo('/dashboard')
  } catch (e: any) {
    Message.error(e?.data?.message || '登录失败，请检查用户名和密码')
  }
}
</script>

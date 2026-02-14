<template>
  <div class="w-full max-w-sm">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-foreground">注册</h1>
      <p class="mt-2 text-sm text-muted-foreground">创建新账号</p>
    </div>

    <a-form
      :model="form"
      layout="vertical"
      @submit-success="handleSubmit"
    >
      <a-form-item field="username" label="用户名" :rules="[
        { required: true, message: '请输入用户名' },
        { minLength: 3, message: '用户名至少3个字符' },
      ]">
        <a-input v-model="form.username" placeholder="请输入用户名" allow-clear />
      </a-form-item>

      <a-form-item field="nickname" label="昵称">
        <a-input v-model="form.nickname" placeholder="可选" allow-clear />
      </a-form-item>

      <a-form-item field="password" label="密码" :rules="[
        { required: true, message: '请输入密码' },
        { minLength: 6, message: '密码至少6个字符' },
      ]">
        <a-input-password v-model="form.password" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item field="confirmPassword" label="确认密码" :rules="[
        { required: true, message: '请确认密码' },
        { validator: validateConfirm, message: '两次密码不一致' },
      ]">
        <a-input-password v-model="form.confirmPassword" placeholder="请再次输入密码" />
      </a-form-item>

      <a-form-item>
        <a-button type="primary" html-type="submit" long :loading="loading">
          注册
        </a-button>
      </a-form-item>
    </a-form>

    <div class="text-center text-sm text-muted-foreground">
      已有账号？
      <NuxtLink to="/login" class="text-primary hover:underline">登录</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const { register, loading } = useAuth()

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

function validateConfirm(value: any, cb: (error?: string) => void) {
  if (value !== form.password) {
    cb('两次密码不一致')
  } else {
    cb()
  }
}

async function handleSubmit() {
  try {
    await register(form.username, form.password, undefined, form.nickname || undefined)
    Message.success('注册成功')
    navigateTo('/dashboard')
  } catch (e: any) {
    Message.error(e?.data?.message || '注册失败，请重试')
  }
}
</script>

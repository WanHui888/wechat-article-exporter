<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <LoginForm />
  </div>
</template>

<script setup lang="ts">
import LoginForm from '~/components/auth/LoginForm.vue'

definePageMeta({ middleware: 'auth' })
</script>

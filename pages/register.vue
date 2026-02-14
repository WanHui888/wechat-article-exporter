<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <RegisterForm />
  </div>
</template>

<script setup lang="ts">
import RegisterForm from '~/components/auth/RegisterForm.vue'

definePageMeta({ middleware: 'auth' })
</script>

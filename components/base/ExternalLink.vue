<script setup lang="ts">
interface Props {
  href: string;
  text: string;
}

defineProps<Props>();
</script>

<template>
  <a :href="href" target="_blank" class="underline text-blue-600 underline-offset-2">{{ text }}</a>
</template>

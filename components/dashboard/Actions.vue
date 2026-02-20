<script setup lang="ts">
import type { ChipColor } from '#ui/types';
import CredentialsDialog, { type CredentialState } from '~/components/global/CredentialsDialog.vue';
import { docsWebSite } from '~/config';
import { request } from '#shared/utils/request';
import { gotoLink } from '~/utils';

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}

// 清空本地数据
const clearLoading = ref(false);
async function clearAllData() {
  if (!confirm('确定要清空所有本地数据吗？此操作不可恢复！')) return;
  clearLoading.value = true;
  await request('/api/store/clear-all', { method: 'POST' });
  clearLoading.value = false;
  alert('本地数据已全部清空，请刷新页面。');
  window.location.reload();
}

// CredentialDialog 相关变量
const credentialsDialogOpen = ref(false);
const credentialState = ref<CredentialState>('inactive');
const credentialPendingCount = ref(0);
const credentialColor: ComputedRef<ChipColor> = computed<ChipColor>(() => {
  switch (credentialState.value) {
    case 'active':
      return 'green';
    case 'inactive':
      return 'gray';
    case 'warning':
      return 'amber';
    default:
      return 'gray';
  }
});

const credentialBadgeText = computed(() => {
  const count = credentialPendingCount.value;
  if (count <= 0) return '';
  return count > 9 ? '+' : `${count}`;
});
const isCredentialActive = computed(() => credentialState.value === 'active');
</script>

<template>
  <ul class="hidden md:flex items-center gap-5">
    <!-- 通知 -->
    <!--    <li>-->
    <!--      <UTooltip text="通知">-->
    <!--        <UChip text="3" size="2xl" color="amber">-->
    <!--          <UIcon name="i-lucide:bell" class="action-icon" />-->
    <!--        </UChip>-->
    <!--      </UTooltip>-->
    <!--    </li>-->

    <!-- 清空本地数据 -->
    <li>
      <UTooltip text="清空本地数据">
        <UIcon
          @click="clearAllData"
          name="i-lucide:trash-2"
          :class="['size-7 cursor-pointer transition-colors', clearLoading ? 'text-rose-400 animate-pulse' : 'text-zinc-400 hover:text-rose-500']"
        />
      </UTooltip>
    </li>

    <!-- 主题切换 -->
    <li>
      <UTooltip :text="isDark ? '切换白天模式' : '切换黑夜模式'">
        <UIcon
          @click="toggleColorMode"
          :name="isDark ? 'i-lucide:sun' : 'i-lucide:moon'"
          class="size-7 text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors"
        />
      </UTooltip>
    </li>

    <!-- Credential -->
    <li>
      <CredentialsDialog
        v-model:open="credentialsDialogOpen"
        v-model:state="credentialState"
        @update:pending-count="credentialPendingCount = $event"
      />
      <UTooltip text="抓取 Credentials">
        <div class="relative">
          <UIcon
            @click="credentialsDialogOpen = true"
            name="i-lucide:dog"
            :class="[
              'size-7 cursor-pointer transition-colors',
              { 'text-zinc-400 hover:text-blue-500': !isCredentialActive },
              { 'text-green-500 hover:text-green-600': isCredentialActive },
            ]"
          />
          <span
            v-if="credentialBadgeText"
            class="absolute -top-1 -right-1 text-[10px] leading-none rounded-full bg-rose-500 text-white px-1.5 py-0.5 min-w-[16px] text-center"
          >
            {{ credentialBadgeText }}
          </span>
        </div>
      </UTooltip>
    </li>

    <!-- 文档 -->
    <li>
      <UTooltip text="文档">
        <UIcon
          name="i-lucide:book-open"
          @click="gotoLink(docsWebSite)"
          class="size-7 text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors"
        />
      </UTooltip>
    </li>

    <!-- GitHub -->
    <li>
      <UTooltip text="GitHub">
        <UIcon
          @click="gotoLink('https://github.com/wechat-article/wechat-article-exporter')"
          name="i-lucide:github"
          class="size-7 text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors"
        />
      </UTooltip>
    </li>
  </ul>
</template>

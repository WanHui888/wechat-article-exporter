<template>
  <aside class="hidden lg:flex lg:flex-col lg:w-64 lg:border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
      <a-icon-apps class="text-lg" />
      <span class="font-semibold text-sidebar-foreground">微信文章导出</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-2 px-2">
      <div v-for="group in menuGroups" :key="group.label" class="mb-4">
        <div class="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {{ group.label }}
        </div>
        <div class="mt-1 space-y-0.5">
          <NuxtLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground transition-colors"
            :class="[
              route.path === item.path
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Admin section -->
      <div v-if="isAdmin" class="mb-4">
        <div class="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          管理
        </div>
        <div class="mt-1 space-y-0.5">
          <NuxtLink
            v-for="item in adminItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground transition-colors"
            :class="[
              route.path === item.path
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- User section -->
    <div class="border-t border-sidebar-border p-3">
      <div class="flex items-center gap-3">
        <a-avatar :size="32">
          {{ user?.nickname?.[0] || user?.username?.[0] || '?' }}
        </a-avatar>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-sidebar-foreground truncate">
            {{ user?.nickname || user?.username }}
          </div>
          <div class="text-xs text-muted-foreground">{{ user?.role === 'admin' ? '管理员' : '用户' }}</div>
        </div>
        <a-button type="text" size="mini" @click="handleLogout">
          <template #icon><icon-export /></template>
        </a-button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  IconHome, IconUser, IconFile, IconLink, IconStar,
  IconSearch, IconDownload, IconHistory, IconSettings,
  IconCloud, IconDashboard, IconUserGroup, IconThunderbolt,
  IconExport, IconApps,
} from '@arco-design/web-vue/es/icon'

const route = useRoute()
const { user, isAdmin, logout } = useAuth()

const menuGroups = [
  {
    label: '数据',
    items: [
      { path: '/dashboard', label: '概览', icon: IconHome },
      { path: '/dashboard/account', label: '公众号管理', icon: IconUser },
      { path: '/dashboard/article', label: '文章列表', icon: IconFile },
      { path: '/dashboard/single', label: '单篇下载', icon: IconLink },
      { path: '/dashboard/album', label: '合集下载', icon: IconDownload },
    ],
  },
  {
    label: '工具',
    items: [
      { path: '/dashboard/favorites', label: '收藏', icon: IconStar },
      { path: '/dashboard/search', label: '全文搜索', icon: IconSearch },
      { path: '/dashboard/exports', label: '导出任务', icon: IconDownload },
      { path: '/dashboard/history', label: '操作历史', icon: IconHistory },
    ],
  },
  {
    label: '设置',
    items: [
      { path: '/dashboard/settings', label: '偏好设置', icon: IconSettings },
      { path: '/dashboard/proxy', label: '代理管理', icon: IconCloud },
    ],
  },
]

const adminItems = [
  { path: '/dashboard/admin/users', label: '用户管理', icon: IconUserGroup },
  { path: '/dashboard/admin/monitor', label: '系统监控', icon: IconDashboard },
  { path: '/dashboard/admin/tasks', label: '任务管理', icon: IconThunderbolt },
]

async function handleLogout() {
  await logout()
}
</script>

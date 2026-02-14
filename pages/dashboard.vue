<template>
  <div class="flex min-h-screen bg-background">
    <!-- Desktop Sidebar -->
    <Sidebar />

    <!-- Mobile Drawer -->
    <a-drawer
      v-model:visible="mobileMenuOpen"
      placement="left"
      :width="280"
      :footer="false"
      :header="false"
      unmount-on-close
    >
      <MobileSidebar @navigate="mobileMenuOpen = false" />
    </a-drawer>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <Header @toggle-menu="mobileMenuOpen = !mobileMenuOpen">
        <template #wechat-status>
          <WeChatStatus />
        </template>
      </Header>

      <main class="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
        <NuxtPage />
      </main>
    </div>

    <!-- Mobile Bottom Nav -->
    <BottomNav />

    <!-- WeChat Login Modal -->
    <WeChatLoginModal v-model:visible="showWeChatLogin" />
  </div>
</template>

<script setup lang="ts">
import Sidebar from '~/components/layout/Sidebar.vue'
import Header from '~/components/layout/Header.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
import WeChatLoginModal from '~/components/modal/WeChatLoginModal.vue'

definePageMeta({ middleware: 'auth' })

const mobileMenuOpen = ref(false)
const { wechatAccount, isWeChatLoggedIn, showLoginModal: showWeChatLogin, openLoginModal, clearSession } = useWeChatSession()

// MobileSidebar is a simplified version for the drawer
const MobileSidebar = defineComponent({
  emits: ['navigate'],
  setup(_, { emit }) {
    const route = useRoute()

    const items = [
      { path: '/dashboard', label: '概览' },
      { path: '/dashboard/account', label: '公众号管理' },
      { path: '/dashboard/article', label: '文章列表' },
      { path: '/dashboard/single', label: '单篇下载' },
      { path: '/dashboard/album', label: '合集下载' },
      { path: '/dashboard/favorites', label: '收藏' },
      { path: '/dashboard/search', label: '全文搜索' },
      { path: '/dashboard/exports', label: '导出任务' },
      { path: '/dashboard/history', label: '操作历史' },
      { path: '/dashboard/settings', label: '偏好设置' },
      { path: '/dashboard/proxy', label: '代理管理' },
    ]

    return () => h('div', { class: 'py-2' }, [
      ...items.map(item =>
        h(resolveComponent('NuxtLink'), {
          to: item.path,
          class: [
            'block px-4 py-2.5 text-sm transition-colors',
            route.path === item.path
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          ],
          onClick: () => emit('navigate'),
        }, () => item.label)
      ),
    ])
  }
})

// WeChat status indicator
const WeChatStatus = defineComponent({
  setup() {
    const { wechatAccount, isWeChatLoggedIn, openLoginModal, clearSession } = useWeChatSession()

    return () => {
      if (isWeChatLoggedIn.value && wechatAccount.value) {
        return h('div', { class: 'flex items-center gap-2 text-xs' }, [
          h('img', {
            src: wechatAccount.value.avatar,
            class: 'w-5 h-5 rounded-full',
            alt: '',
          }),
          h('span', { class: 'text-foreground' }, wechatAccount.value.nickname),
          h('button', {
            class: 'text-muted-foreground hover:text-foreground ml-1',
            onClick: () => clearSession(),
            title: '退出微信登录',
          }, '\u00d7'),
        ])
      }
      return h('button', {
        class: 'text-xs text-primary hover:underline',
        onClick: () => openLoginModal(),
      }, '登录微信公众号')
    }
  }
})
</script>

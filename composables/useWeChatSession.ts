import { ref, computed } from 'vue'

interface WeChatAccount {
  nickname: string
  avatar: string
  expires: string
}

const wechatAccount = ref<WeChatAccount | null>(null)
const showLoginModal = ref(false)

// Load from localStorage on init
if (import.meta.client) {
  try {
    const saved = localStorage.getItem('wechat_session')
    if (saved) {
      wechatAccount.value = JSON.parse(saved)
    }
  } catch {
    // ignore
  }
}

export function useWeChatSession() {
  const isWeChatLoggedIn = computed(() => {
    if (!wechatAccount.value) return false
    if (new Date(wechatAccount.value.expires) < new Date()) {
      clearSession()
      return false
    }
    return true
  })

  function setSession(account: WeChatAccount) {
    wechatAccount.value = account
    localStorage.setItem('wechat_session', JSON.stringify(account))
  }

  function clearSession() {
    wechatAccount.value = null
    localStorage.removeItem('wechat_session')
  }

  function openLoginModal() {
    showLoginModal.value = true
  }

  function closeLoginModal() {
    showLoginModal.value = false
  }

  /** Opens login modal if not logged in. Returns true if already logged in. */
  function requireWeChatLogin(): boolean {
    if (isWeChatLoggedIn.value) return true
    openLoginModal()
    return false
  }

  return {
    wechatAccount,
    isWeChatLoggedIn,
    showLoginModal,
    setSession,
    clearSession,
    openLoginModal,
    closeLoginModal,
    requireWeChatLogin,
  }
}

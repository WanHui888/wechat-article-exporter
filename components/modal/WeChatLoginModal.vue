<template>
  <a-modal
    :visible="visible"
    :footer="false"
    :mask-closable="false"
    title="登录微信公众号"
    width="400px"
    @cancel="handleClose"
  >
    <div class="flex flex-col items-center justify-center py-4" style="min-height: 320px;">
      <!-- Loading / Status -->
      <div v-if="loading && !qrcodeSrc" class="flex flex-col items-center gap-3">
        <icon-loading class="text-2xl animate-spin text-gray-400" />
        <span class="text-sm text-gray-500">{{ statusMsg }}</span>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="text-center mb-3">
        <p class="text-red-500 text-sm">{{ errorMsg }}</p>
      </div>

      <!-- QR Code -->
      <div v-if="qrcodeSrc" class="flex flex-col items-center gap-3">
        <img :src="qrcodeSrc" alt="QR Code" class="w-64 h-64 rounded-md" />
        <p v-if="statusMsg" class="text-sm text-gray-500">{{ statusMsg }}</p>
      </div>

      <!-- Scanned, waiting confirm -->
      <div v-if="!qrcodeSrc && scanned" class="flex flex-col items-center gap-3">
        <icon-check-circle class="text-4xl text-green-500" />
        <span class="text-sm text-gray-500">{{ statusMsg }}</span>
      </div>

      <!-- Retry button -->
      <a-button v-if="errorMsg && !loading" type="primary" class="mt-4" @click="startLogin">
        重新获取二维码
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconLoading, IconCheckCircle } from '@arco-design/web-vue/es/icon'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const { setSession } = useWeChatSession()

const qrcodeSrc = ref('')
const loading = ref(false)
const statusMsg = ref('')
const errorMsg = ref('')
const scanned = ref(false)
const checkTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function getAuthHeaders(): Record<string, string> {
  if (import.meta.server) return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

watch(() => props.visible, (val) => {
  if (val) {
    startLogin()
  } else {
    stopPolling()
  }
})

function handleClose() {
  stopPolling()
  emit('update:visible', false)
}

function stopPolling() {
  if (checkTimer.value) {
    clearTimeout(checkTimer.value)
    checkTimer.value = null
  }
}

function resetState() {
  qrcodeSrc.value = ''
  loading.value = false
  statusMsg.value = ''
  errorMsg.value = ''
  scanned.value = false
  stopPolling()
}

async function startLogin() {
  resetState()
  try {
    loading.value = true
    statusMsg.value = '获取登录二维码...'

    // 1. Create login session
    const sid = Date.now().toString() + Math.floor(Math.random() * 100)
    const sessionResp = await $fetch<any>(`/api/web/login/session/${sid}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    if (sessionResp?.base_resp?.ret !== 0) {
      throw new Error(sessionResp?.base_resp?.err_msg || '获取登录会话失败')
    }

    // 2. Show QR code
    qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`
    statusMsg.value = '请使用微信扫描二维码'
    loading.value = false

    // 3. Start polling
    scheduleCheck()
  } catch (e: any) {
    loading.value = false
    errorMsg.value = e.message || '获取二维码失败'
  }
}

function scheduleCheck() {
  stopPolling()
  if (props.visible) {
    checkTimer.value = setTimeout(checkScanStatus, 2000)
  }
}

async function checkScanStatus() {
  try {
    const resp = await $fetch<any>('/api/web/login/scan', {
      headers: getAuthHeaders(),
    })

    if (!resp?.base_resp || resp.base_resp.ret !== 0) {
      scheduleCheck()
      return
    }

    switch (resp.status) {
      case 0:
        // Waiting for scan
        scheduleCheck()
        break
      case 1:
        // Confirmed, complete login
        statusMsg.value = '已确认，正在登录中...'
        scanned.value = true
        qrcodeSrc.value = ''
        loading.value = true
        await completeLogin()
        break
      case 2:
      case 3:
        // QR code expired, refresh
        qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`
        statusMsg.value = '二维码已过期，已自动刷新'
        scheduleCheck()
        break
      case 4:
      case 6:
        // Scanned, waiting for confirm
        if (resp.acct_size >= 1) {
          scanned.value = true
          qrcodeSrc.value = ''
          statusMsg.value = '扫码成功，请在手机上确认登录'
        } else {
          statusMsg.value = '没有可登录的公众号账号'
        }
        scheduleCheck()
        break
      case 5:
        // Email not bound
        errorMsg.value = '该账号尚未绑定邮箱，无法扫码登录'
        break
    }
  } catch {
    // Network error, retry
    scheduleCheck()
  }
}

async function completeLogin() {
  try {
    const resp = await $fetch<any>('/api/web/login/bizlogin', {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    if (resp.err) {
      throw new Error(resp.err)
    }

    setSession({
      nickname: resp.nickname,
      avatar: resp.avatar,
      expires: resp.expires,
    })

    Message.success('登录成功')
    handleClose()
  } catch (e: any) {
    errorMsg.value = e.message || '登录失败'
    loading.value = false
    scanned.value = false
  }
}

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold text-foreground">偏好设置</h1>
      <p class="text-muted-foreground mt-1">管理账号信息和应用设置</p>
    </div>

    <!-- Profile section -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">个人信息</h2>
      <a-form :model="profileForm" layout="vertical">
        <a-form-item label="用户名">
          <a-input :model-value="user?.username" disabled />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model="profileForm.nickname" placeholder="设置昵称" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model="profileForm.email" placeholder="设置邮箱" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="saveProfile">保存</a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- Password section -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">修改密码</h2>
      <a-form :model="passwordForm" layout="vertical">
        <a-form-item label="当前密码">
          <a-input-password v-model="passwordForm.oldPassword" />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model="passwordForm.newPassword" />
        </a-form-item>
        <a-form-item label="确认新密码">
          <a-input-password v-model="passwordForm.confirmPassword" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="savePassword">修改密码</a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- Appearance -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">外观设置</h2>
      <a-form layout="vertical">
        <a-form-item label="主题">
          <a-radio-group :model-value="currentTheme" @change="handleThemeChange">
            <a-radio value="light">浅色</a-radio>
            <a-radio value="dark">深色</a-radio>
            <a-radio value="system">跟随系统</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </div>

    <!-- Download Preferences -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">下载设置</h2>
      <a-form :model="downloadPrefs" layout="vertical">
        <a-form-item label="默认导出格式">
          <a-select v-model="downloadPrefs.exportFormat">
            <a-option value="html">HTML</a-option>
            <a-option value="excel">Excel</a-option>
            <a-option value="json">JSON</a-option>
            <a-option value="txt">TXT</a-option>
            <a-option value="markdown">Markdown</a-option>
            <a-option value="word">Word</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="并发下载数">
          <a-input-number v-model="downloadPrefs.concurrency" :min="1" :max="10" />
        </a-form-item>
        <a-form-item label="下载间隔（毫秒）" help="每次下载之间的等待时间，避免被限流">
          <a-input-number v-model="downloadPrefs.interval" :min="0" :max="10000" :step="100" />
        </a-form-item>
        <a-form-item label="同步后自动下载" help="同步文章列表后自动下载文章内容">
          <a-switch v-model="downloadPrefs.autoDownload" />
        </a-form-item>
        <a-form-item label="默认同步间隔（小时）" help="自动同步公众号文章的时间间隔">
          <a-input-number v-model="downloadPrefs.syncInterval" :min="1" :max="168" />
        </a-form-item>
        <a-form-item label="通知提醒" help="同步和下载完成时显示通知">
          <a-switch v-model="downloadPrefs.notificationsEnabled" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="savingPrefs" @click="saveDownloadPrefs">保存</a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- Credential Management -->
    <div class="rounded-lg border border-border bg-background p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Credential 管理</h2>
          <p class="text-sm text-muted-foreground mt-1">
            用于获取文章阅读量、评论等数据。从微信文章页面的请求中提取。
          </p>
        </div>
        <a-button type="primary" size="small" @click="showAddCredentialModal = true">
          添加
        </a-button>
      </div>

      <div v-if="credentials.length === 0" class="text-center text-muted-foreground py-6">
        暂无 Credential
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="cred in credentials"
          :key="cred.id"
          class="flex items-center justify-between p-3 rounded border border-border"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium">
              {{ cred.nickname || cred.biz }}
            </div>
            <div class="text-xs text-muted-foreground font-mono mt-1">
              uin: {{ cred.uin }} · key: {{ maskString(cred.key) }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              添加时间: {{ new Date(cred.timestamp).toLocaleString('zh-CN') }}
            </div>
          </div>
          <a-popconfirm content="确定删除此 Credential？" @ok="deleteCredential(cred.biz)">
            <a-button type="text" size="small" status="danger">
              <template #icon><icon-delete /></template>
            </a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <!-- Add Credential Modal -->
    <a-modal
      v-model:visible="showAddCredentialModal"
      title="添加 Credential"
      :ok-loading="addingCredential"
      @ok="handleAddCredential"
    >
      <a-form :model="credentialForm" layout="vertical">
        <a-form-item label="__biz" required>
          <a-input v-model="credentialForm.biz" placeholder="公众号的 __biz 参数" />
        </a-form-item>
        <a-form-item label="uin" required>
          <a-input v-model="credentialForm.uin" placeholder="uin 参数" />
        </a-form-item>
        <a-form-item label="key" required>
          <a-input v-model="credentialForm.key" placeholder="key 参数" />
        </a-form-item>
        <a-form-item label="pass_ticket" required>
          <a-input v-model="credentialForm.passTicket" placeholder="pass_ticket 参数" />
        </a-form-item>
        <a-form-item label="wap_sid2">
          <a-input v-model="credentialForm.wapSid2" placeholder="可选" />
        </a-form-item>
        <a-form-item label="备注名称">
          <a-input v-model="credentialForm.nickname" placeholder="可选，方便识别" />
        </a-form-item>
      </a-form>
      <a-alert type="info" class="mt-3">
        <template #title>如何获取</template>
        在手机微信中打开任意文章，使用抓包工具获取请求参数中的 uin、key、pass_ticket 等值。
      </a-alert>
    </a-modal>

    <!-- Storage section -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">存储空间</h2>
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">已使用</span>
          <span class="text-foreground">{{ formatSize(user?.storageUsed || 0) }} / {{ formatSize(user?.storageQuota || 0) }}</span>
        </div>
        <a-progress :percent="storagePercent" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconDelete } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import type { Credential } from '~/types'
import { apiGetCredentials, apiSaveCredential, apiDeleteCredential } from '~/apis/data'

const { user, updateProfile, changePassword } = useAuth()
const { preferences, loadPreferences, updatePreferences } = usePreferences()
const { theme: currentTheme, setTheme } = useTheme()

const profileForm = reactive({
  nickname: user.value?.nickname || '',
  email: user.value?.email || '',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Download preferences
const downloadPrefs = reactive({
  exportFormat: 'html',
  concurrency: 3,
  interval: 1000,
  autoDownload: false,
  syncInterval: 24,
  notificationsEnabled: true,
})

const savingPrefs = ref(false)

function handleThemeChange(value: string | number | Record<string, any> | undefined) {
  const newTheme = value as 'light' | 'dark' | 'system'
  setTheme(newTheme)
  updatePreferences({ theme: newTheme }).catch(() => {})
}

// Credentials
const credentials = ref<Credential[]>([])
const showAddCredentialModal = ref(false)
const addingCredential = ref(false)
const credentialForm = reactive({
  biz: '',
  uin: '',
  key: '',
  passTicket: '',
  wapSid2: '',
  nickname: '',
})

const storagePercent = computed(() => {
  if (!user.value?.storageQuota) return 0
  return Math.round((user.value.storageUsed / user.value.storageQuota) * 100)
})

onMounted(async () => {
  await loadPreferences()
  const prefs = preferences.value as any
  if (prefs?.exportFormat) downloadPrefs.exportFormat = prefs.exportFormat
  if (prefs?.concurrency) downloadPrefs.concurrency = prefs.concurrency
  if (prefs?.interval != null) downloadPrefs.interval = prefs.interval
  if (prefs?.autoDownload != null) downloadPrefs.autoDownload = prefs.autoDownload
  if (prefs?.syncInterval) downloadPrefs.syncInterval = prefs.syncInterval
  if (prefs?.notificationsEnabled != null) downloadPrefs.notificationsEnabled = prefs.notificationsEnabled

  loadCredentials()
})

async function loadCredentials() {
  try {
    credentials.value = await apiGetCredentials()
  } catch {
    // ignore
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function maskString(str: string): string {
  if (!str || str.length <= 8) return str
  return str.slice(0, 4) + '****' + str.slice(-4)
}

async function saveProfile() {
  try {
    await updateProfile({
      nickname: profileForm.nickname,
      email: profileForm.email,
    })
    Message.success('保存成功')
  } catch {
    Message.error('保存失败')
  }
}

async function savePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    Message.warning('两次密码不一致')
    return
  }
  try {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    Message.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch {
    Message.error('密码修改失败')
  }
}

async function saveDownloadPrefs() {
  savingPrefs.value = true
  try {
    await updatePreferences({
      exportFormat: downloadPrefs.exportFormat,
      concurrency: downloadPrefs.concurrency,
      interval: downloadPrefs.interval,
      autoDownload: downloadPrefs.autoDownload,
      syncInterval: downloadPrefs.syncInterval,
      notificationsEnabled: downloadPrefs.notificationsEnabled,
    } as any)
    Message.success('保存成功')
  } catch {
    Message.error('保存失败')
  } finally {
    savingPrefs.value = false
  }
}

async function handleAddCredential() {
  if (!credentialForm.biz || !credentialForm.uin || !credentialForm.key || !credentialForm.passTicket) {
    Message.warning('请填写必填字段')
    return
  }

  addingCredential.value = true
  try {
    await apiSaveCredential({
      biz: credentialForm.biz,
      uin: credentialForm.uin,
      key: credentialForm.key,
      passTicket: credentialForm.passTicket,
      wapSid2: credentialForm.wapSid2 || null,
      nickname: credentialForm.nickname || null,
      timestamp: Date.now(),
    })
    Message.success('添加成功')
    showAddCredentialModal.value = false

    // Reset form
    credentialForm.biz = ''
    credentialForm.uin = ''
    credentialForm.key = ''
    credentialForm.passTicket = ''
    credentialForm.wapSid2 = ''
    credentialForm.nickname = ''

    await loadCredentials()
  } catch (e: any) {
    Message.error(e.message || '添加失败')
  } finally {
    addingCredential.value = false
  }
}

async function deleteCredential(biz: string) {
  try {
    await apiDeleteCredential(biz)
    Message.success('已删除')
    await loadCredentials()
  } catch {
    Message.error('删除失败')
  }
}
</script>

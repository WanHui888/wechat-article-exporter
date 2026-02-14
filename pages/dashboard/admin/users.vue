<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">用户管理</h1>
      <p class="text-muted-foreground mt-1">管理系统用户</p>
    </div>

    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table :data="users" :loading="loading" :bordered="false" row-key="id">
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="60" />
          <a-table-column title="用户名" data-index="username" :width="120" />
          <a-table-column title="昵称" data-index="nickname" :width="120" />
          <a-table-column title="角色" :width="100">
            <template #cell="{ record }">
              <a-select
                :model-value="record.role"
                size="mini"
                :disabled="record.role === 'admin' && isCurrentUser(record)"
                @change="(val: any) => changeRole(record, val)"
              >
                <a-option value="user">用户</a-option>
                <a-option value="admin">管理员</a-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'">
                {{ record.status === 'active' ? '正常' : '禁用' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="注册时间" :width="160">
            <template #cell="{ record }">
              {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="!isCurrentUser(record)"
                  type="text"
                  size="mini"
                  :status="record.status === 'active' ? 'danger' : 'success'"
                  @click="toggleStatus(record)"
                >
                  {{ record.status === 'active' ? '禁用' : '启用' }}
                </a-button>
                <a-button
                  v-if="!isCurrentUser(record)"
                  type="text"
                  size="mini"
                  @click="openResetPassword(record)"
                >
                  重置密码
                </a-button>
                <a-popconfirm
                  v-if="!isCurrentUser(record) && record.role !== 'admin'"
                  content="确定要删除该用户？此操作不可恢复。"
                  @ok="deleteUser(record)"
                >
                  <a-button type="text" size="mini" status="danger">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>

    <!-- Reset Password Modal -->
    <a-modal
      v-model:visible="showResetModal"
      title="重置密码"
      @ok="handleResetPassword"
    >
      <a-form layout="vertical">
        <a-form-item :label="`为用户 ${resetTarget?.username} 设置新密码`">
          <a-input-password v-model="newPassword" placeholder="至少6位" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const { user: currentUser } = useAuth()

const users = ref<any[]>([])
const loading = ref(false)
const showResetModal = ref(false)
const resetTarget = ref<any>(null)
const newPassword = ref('')

onMounted(() => loadUsers())

function isCurrentUser(record: any): boolean {
  return record.id === currentUser.value?.id
}

async function loadUsers() {
  loading.value = true
  try {
    const resp = await $fetch<any>('/api/admin/users')
    const data = resp.data?.items || resp.data || resp || []
    users.value = Array.isArray(data) ? data : []
  } catch {
    Message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(record: any) {
  try {
    const newStatus = record.status === 'active' ? 'disabled' : 'active'
    await $fetch('/api/admin/users/status', {
      method: 'PUT',
      body: { userId: record.id, status: newStatus },
    })
    record.status = newStatus
    Message.success('操作成功')
  } catch {
    Message.error('操作失败')
  }
}

async function changeRole(record: any, newRole: string) {
  if (newRole === record.role) return
  try {
    await $fetch('/api/admin/users/role', {
      method: 'PUT',
      body: { userId: record.id, role: newRole },
    })
    record.role = newRole
    Message.success('角色已更新')
  } catch (e: any) {
    Message.error(e.data?.statusMessage || '操作失��')
  }
}

function openResetPassword(record: any) {
  resetTarget.value = record
  newPassword.value = ''
  showResetModal.value = true
}

async function handleResetPassword() {
  if (!newPassword.value || newPassword.value.length < 6) {
    Message.warning('密码至少6位')
    return
  }
  try {
    await $fetch('/api/admin/users/reset-password', {
      method: 'POST',
      body: { userId: resetTarget.value.id, newPassword: newPassword.value },
    })
    Message.success('密码已重置')
    showResetModal.value = false
  } catch (e: any) {
    Message.error(e.data?.statusMessage || '重置失败')
  }
}

async function deleteUser(record: any) {
  try {
    await $fetch('/api/admin/users/delete', {
      method: 'POST',
      body: { userId: record.id },
    })
    users.value = users.value.filter(u => u.id !== record.id)
    Message.success('用户已删除')
  } catch (e: any) {
    Message.error(e.data?.statusMessage || '删除失败')
  }
}
</script>

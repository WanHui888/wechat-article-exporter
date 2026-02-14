import { ref, readonly } from 'vue'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const notifications = ref<Notification[]>([])

export function useNotification() {
  function notify(options: Omit<Notification, 'id'>) {
    const id = Math.random().toString(36).slice(2)
    const notification: Notification = { id, ...options }
    notifications.value.push(notification)

    const duration = options.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  function success(title: string, message?: string) {
    notify({ type: 'success', title, message })
  }

  function error(title: string, message?: string) {
    notify({ type: 'error', title, message, duration: 5000 })
  }

  function warning(title: string, message?: string) {
    notify({ type: 'warning', title, message })
  }

  function info(title: string, message?: string) {
    notify({ type: 'info', title, message })
  }

  function remove(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications: readonly(notifications),
    notify,
    success,
    error,
    warning,
    info,
    remove,
  }
}

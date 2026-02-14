import { ref } from 'vue'
import type { UserPreferencesData } from '~/types'
import { apiGetPreferences, apiUpdatePreferences } from '~/apis/data'

const preferences = ref<UserPreferencesData>({})
const loaded = ref(false)

export function usePreferences() {
  async function loadPreferences() {
    if (loaded.value) return preferences.value
    preferences.value = await apiGetPreferences()
    loaded.value = true
    return preferences.value
  }

  async function updatePreferences(data: Partial<UserPreferencesData>) {
    preferences.value = await apiUpdatePreferences(data)
    return preferences.value
  }

  function resetLoaded() {
    loaded.value = false
  }

  return {
    preferences,
    loaded,
    loadPreferences,
    updatePreferences,
    resetLoaded,
  }
}
